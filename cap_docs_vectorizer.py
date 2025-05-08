import os
import re
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
import numpy as np
from sentence_transformers import SentenceTransformer
from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance, PointStruct
import markdown
from bs4 import BeautifulSoup
import logging
from tqdm import tqdm
import time

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@dataclass
class TextChunk:
    text: str
    metadata: Dict
    start_idx: int
    is_code: bool = False
    heading_hierarchy: Optional[List[str]] = None

class DocumentProcessor:
    def __init__(self, 
                 model_name: str = 'thenlper/gte-large',
                 chunk_size: int = 1024,
                 chunk_overlap: int = 256,
                 batch_size: int = 32):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.batch_size = batch_size
        
        logger.info(f"Loading model: {model_name}")
        self.model = SentenceTransformer(model_name, trust_remote_code=True)
        self.model.max_seq_length = 8192
        
        # Patterns for parsing
        self.code_pattern = re.compile(r'```[\s\S]*?```')
        self.header_pattern = re.compile(r'^(#{1,6})\s+(.+)$', re.MULTILINE)
        
    def extract_code_blocks(self, text: str) -> List[Tuple[str, int]]:
        """Extract code blocks and their positions from markdown text."""
        return [(match.group(), match.start()) for match in self.code_pattern.finditer(text)]
    
    def extract_headers(self, text: str) -> List[Tuple[int, str, str]]:
        """Extract headers and their levels from markdown text."""
        headers = []
        for match in self.header_pattern.finditer(text):
            level = len(match.group(1))  # Number of # symbols
            header_text = match.group(2).strip()
            headers.append((level, header_text, match.start()))
        return headers
    
    def get_heading_context(self, headers: List[Tuple[int, str, str]], position: int) -> List[str]:
        """Get the heading hierarchy at a given position."""
        current_headers = [None] * 6  # For h1 to h6
        relevant_headers = []
        
        for level, text, start in headers:
            if start > position:
                break
            current_headers[level - 1] = text
            # Clear lower level headers when we find a higher level one
            for i in range(level, 6):
                current_headers[i] = None
                
        return [h for h in current_headers if h is not None]
    
    def clean_markdown(self, text: str) -> str:
        """Convert markdown to plain text while preserving structure."""
        html = markdown.markdown(text)
        soup = BeautifulSoup(html, 'html.parser')
        return soup.get_text(separator=' ', strip=True)
    
    def create_chunks(self, text: str, metadata: Dict, headers: List[Tuple[int, str, str]], 
                     is_code: bool = False) -> List[TextChunk]:
        """Create overlapping chunks from text with header context."""
        chunks = []
        
        if len(text) <= self.chunk_size:
            heading_hierarchy = self.get_heading_context(headers, 0)
            return [TextChunk(
                text=text,
                metadata=metadata,
                start_idx=0,
                is_code=is_code,
                heading_hierarchy=heading_hierarchy
            )]
        
        start = 0
        while start < len(text):
            end = start + self.chunk_size
            
            # If not at the beginning, start from the last complete sentence
            if start > 0:
                prev_end = max(0, start - self.chunk_overlap)
                start = prev_end
            
            chunk_text = text[start:end]
            
            # Try to break at sentence boundary if possible
            if end < len(text):
                last_period = chunk_text.rfind('.')
                if last_period > self.chunk_size * 0.5:
                    end = start + last_period + 1
                    chunk_text = text[start:end]
            
            heading_hierarchy = self.get_heading_context(headers, start)
            
            chunks.append(TextChunk(
                text=chunk_text,
                metadata={
                    **metadata,
                    'chunk_start': start,
                    'headers': heading_hierarchy
                },
                start_idx=start,
                is_code=is_code,
                heading_hierarchy=heading_hierarchy
            ))
            
            start = end - self.chunk_overlap
            
        return chunks

    def process_file(self, file_path: str) -> List[TextChunk]:
        """Process a markdown file and return chunks."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            logger.error(f"Error reading file {file_path}: {str(e)}")
            return []
        
        relative_path = os.path.relpath(file_path, start=os.path.join(os.getcwd(), 'docs'))
        metadata = {
            'file_path': relative_path,
            'file_name': os.path.basename(file_path),
            'directory': os.path.dirname(relative_path)
        }
        
        # Extract headers first for context
        headers = self.extract_headers(content)
        
        chunks = []
        
        # Extract code blocks
        code_blocks = self.extract_code_blocks(content)
        last_end = 0
        
        for code_block, start_pos in code_blocks:
            # Process text before code block
            if start_pos > last_end:
                text_content = content[last_end:start_pos]
                text_content = self.clean_markdown(text_content)
                if text_content.strip():
                    chunks.extend(self.create_chunks(text_content, metadata, headers))
            
            # Process code block
            clean_code = code_block.strip('`').strip()
            if clean_code:
                chunks.extend(self.create_chunks(
                    clean_code,
                    {**metadata, 'content_type': 'code'},
                    headers,
                    is_code=True
                ))
            
            last_end = start_pos + len(code_block)
        
        # Process remaining text
        if last_end < len(content):
            text_content = self.clean_markdown(content[last_end:])
            if text_content.strip():
                chunks.extend(self.create_chunks(text_content, metadata, headers))
        
        return chunks

    def vectorize_chunks(self, chunks: List[TextChunk]) -> List[np.ndarray]:
        """Vectorize text chunks using the embedding model."""
        texts = [chunk.text for chunk in chunks]
        vectors = []
        
        for i in tqdm(range(0, len(texts), self.batch_size), desc="Vectorizing chunks"):
            batch_texts = texts[i:i + self.batch_size]
            try:
                batch_vectors = self.model.encode(
                    batch_texts,
                    show_progress_bar=False,
                    convert_to_numpy=True
                )
                vectors.extend(batch_vectors)
                
                # Add small delay to prevent potential rate limiting
                time.sleep(0.1)
            except Exception as e:
                logger.error(f"Error vectorizing batch {i}: {str(e)}")
                # Add zero vectors for failed embeddings
                batch_vectors = np.zeros((len(batch_texts), self.model.get_sentence_embedding_dimension()))
                vectors.extend(batch_vectors)
        
        return vectors

class QdrantManager:
    def __init__(self, collection_name: str = "gte-docs"):
        self.client = QdrantClient(
    url=os.getenv("QDRANT_CLOUD_URL"),
    api_key=os.getenv("QDRANT_CLOUD_API_KEY"),
)
        self.collection_name = collection_name
        
    def initialize_collection(self, vector_size: int):
        """Initialize or recreate the collection."""
        try:
            collections = self.client.get_collections().collections
            existing = any(c.name == self.collection_name for c in collections)
            
            if existing:
                logger.info(f"Deleting existing collection: {self.collection_name}")
                self.client.delete_collection(self.collection_name)
            
            logger.info(f"Creating collection: {self.collection_name}")
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE)
            )
        except Exception as e:
            logger.error(f"Error initializing collection: {str(e)}")
            raise
    
    def upload_vectors(self, chunks: List[TextChunk], vectors: List[np.ndarray]):
        """Upload vectors and their metadata to Qdrant."""
        points = []
        for idx, (chunk, vector) in enumerate(zip(chunks, vectors)):
            point = PointStruct(
                id=idx,
                vector=vector.tolist(),
                payload={
                    **chunk.metadata,
                    'text': chunk.text,
                    'is_code': chunk.is_code,
                    'heading_hierarchy': chunk.heading_hierarchy
                }
            )
            points.append(point)
        
        # Upload in batches
        batch_size = 100
        total_batches = (len(points) + batch_size - 1) // batch_size
        
        for i in tqdm(range(0, len(points), batch_size), desc="Uploading to Qdrant", total=total_batches):
            batch = points[i:i + batch_size]
            try:
                self.client.upsert(
                    collection_name=self.collection_name,
                    points=batch
                )
            except Exception as e:
                logger.error(f"Error uploading batch {i}: {str(e)}")
                # Continue with next batch

def main():
    # Initialize processors
    doc_processor = DocumentProcessor()
    qdrant_manager = QdrantManager()
    
    # Get vector size from the model
    vector_size = doc_processor.model.get_sentence_embedding_dimension()
    logger.info(f"Vector size: {vector_size}")
    
    # Initialize Qdrant collection
    qdrant_manager.initialize_collection(vector_size)
    
    # Directory structure for SAP CAP documentation
    directories = [
        'about',
        'cds',
        'guides',
        'java',
        'node.js',
        'tools'
    ]
    
    base_path = os.path.join(os.getcwd(), 'docs')
    all_chunks = []
    
    # Process all markdown files
    for directory in directories:
        dir_path = os.path.join(base_path, directory)
        if not os.path.exists(dir_path):
            logger.warning(f"Directory not found: {dir_path}")
            continue
            
        for root, _, files in os.walk(dir_path):
            md_files = [f for f in files if f.endswith('.md')]
            if not md_files:
                continue
                
            logger.info(f"Processing directory: {root}")
            for file in md_files:
                file_path = os.path.join(root, file)
                logger.info(f"Processing file: {file_path}")
                try:
                    chunks = doc_processor.process_file(file_path)
                    all_chunks.extend(chunks)
                except Exception as e:
                    logger.error(f"Error processing file {file_path}: {str(e)}")
    
    if not all_chunks:
        logger.error("No chunks were processed. Exiting.")
        return
    
    logger.info(f"Vectorizing {len(all_chunks)} chunks...")
    vectors = doc_processor.vectorize_chunks(all_chunks)
    
    logger.info("Uploading to Qdrant...")
    qdrant_manager.upload_vectors(all_chunks, vectors)
    
    logger.info("Processing complete!")
    logger.info(f"Total chunks processed: {len(all_chunks)}")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        logger.error(f"Fatal error: {str(e)}", exc_info=True)