"""
Primary CLI entry point for the documentation MCP server.
"""
import argparse
import sys
from pathlib import Path
from typing import Optional, List

# from .server import DocsServer
from .server import mcp

def main():

    parser = argparse.ArgumentParser(
        description="MCP server for documentation search and management"
    )
    """Main entry point for the MCP server."""
    parser.parse_args()
    
    # Verify docs directory exists
    mcp.run()

if __name__ == "__main__":
    main()
