"""
MCP Server implementation with database search and addition tools.
"""
from typing import Dict, List, Optional
from pathlib import Path

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams
from sentence_transformers import SentenceTransformer

from mcp.server.fastmcp import FastMCP
from mcp.shared.exceptions import McpError
from mcp.types import ErrorData, INTERNAL_ERROR, INVALID_PARAMS
import pdb
# Initialize FastMCP with the service name
mcp = FastMCP("docs")

# Initialize global components
#pdb.set_trace()
model = SentenceTransformer('thenlper/gte-large')
qdrant_client = QdrantClient(
    url="https://9939ea4c-8018-4761-9cfd-9ecfaf96c933.us-west-2-0.aws.cloud.qdrant.io:6333", 
    api_key="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.xdZz4QTYg1WbMos0-l4dRzHRqAOy8-V2vAof5yhZdVw",
)

# qdrant_client = QdrantClient(host="localhost", port=6333)
print(qdrant_client.get_collections())

# Ensure the collection exists
def init_collection(collection_name: str = "gte-docs"):
    """Initialize the Qdrant collection if it doesn't exist."""
    collections = qdrant_client.get_collections().collections
    # print(collections, " collections")
    exists = any(c.name == collection_name for c in collections)
        
    if not exists:
        qdrant_client.create_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(
                size=1024,  # Dimension for 'all-MiniLM-L6-v2' model
                distance=Distance.COSINE
            )
        )

# Initialize the collection on startup
init_collection()

@mcp.tool()
def search_database(query: str, limit: int = 5) -> List[Dict]:
    """
    Search the vector database for documents similar to the query.
    
    Args:
        query: The search query text
        limit: Maximum number of results to return (default: 5)
    
    Returns:
        List of matching documents with their similarity scores
        
    Example:
        search_database("How to implement authentication?", limit=3)
    """
    try:
        # Validate input
        if not query.strip():
            raise ValueError("Query cannot be empty.")
        if limit < 1:
            raise ValueError("Limit must be greater than 0.")
            
        # Generate query vector
        query_vector = model.encode(query)
        
        # Search in Qdrant
        search_result = qdrant_client.search(
            collection_name="gte-docs",
            query_vector=query_vector,
            limit=limit
        )
        
        # Format results
        results = [
            {
                "text": hit.payload.get("text"),
                "score": hit.score,
                "metadata": hit.payload.get("metadata", {})
            }
            for hit in search_result
        ]
        
        return results
        
    except ValueError as e:
        raise McpError(ErrorData(INVALID_PARAMS, str(e))) from e
    except Exception as e:
        raise McpError(ErrorData(INTERNAL_ERROR, f"Search error: {str(e)}")) from e


@mcp.tool()
def add_data_to_db(content: str, metadata: Optional[Dict] = None) -> Dict:
    """
    Add a new document to the vector database.
    
    Args:
        content: The document text content to index
        metadata: Optional metadata about the document (e.g., source, author)
    
    Returns:
        Dictionary containing the indexing status
        
    Example:
        add_data_to_db(
            "Authentication requires proper user credentials...",
            metadata={"source": "auth_docs.md", "section": "Authentication"}
        )
    """
    try:
        # Validate input
        if not content.strip():
            raise ValueError("Content cannot be empty.")
        if metadata is not None and not isinstance(metadata, dict):
            raise ValueError("Metadata must be a dictionary or None.")
            
        # Generate vector for the document
        vector = model.encode(content)
        
        # Prepare payload
        payload = {
            "text": content,
            "metadata": metadata or {}
        }
        \
        # Upload to Qdrant
        qdrant_client.upload_records(
            collection_name="gte-docs",
            records=[{
                "vector": vector.tolist(),
                "payload": payload
            }]
        )
        
        return {
            "status": "success",
            "message": "Document indexed successfully",
            "metadata": metadata
        }
        
    except ValueError as e:
        raise McpError(ErrorData(INVALID_PARAMS, str(e))) from e
    except Exception as e:
        raise McpError(ErrorData(INTERNAL_ERROR, f"Indexing error: {str(e)}")) from e