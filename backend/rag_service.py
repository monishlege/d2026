"""
Qdrant Vector Database Integration Module.

Handles semantic search and RAG (Retrieval-Augmented Generation) over
government scheme documents and eligibility rules using vector embeddings.

API Reference: https://qdrant.tech/
"""

import logging
from typing import Dict, List, Optional, Any, TYPE_CHECKING

from config import Config

logger = logging.getLogger(__name__)

try:
    from qdrant_client import QdrantClient
    from qdrant_client.models import Distance, VectorParams, PointStruct
    QDRANT_AVAILABLE = True
except ImportError:
    QDRANT_AVAILABLE = False
    QdrantClient = None  # type: ignore
    Distance = None  # type: ignore
    VectorParams = None  # type: ignore
    PointStruct = None  # type: ignore
    logger.warning(
        "qdrant-client library not installed. "
        "Install with: pip install qdrant-client>=1.9.0"
    )


class QdrantError(Exception):
    """Custom exception for Qdrant errors."""
    pass


class RagClient:
    """Client for RAG (Retrieval-Augmented Generation) using Qdrant."""

    def __init__(self, embedding_dim: int = 384):
        """
        Initialize Qdrant RAG client.
        
        Args:
            embedding_dim: Dimension of embeddings (default: 384 for sentence-transformers)
        """
        self.qdrant_url = Config.QDRANT_URL
        self.qdrant_api_key = Config.QDRANT_API_KEY
        self.collection_name = Config.QDRANT_COLLECTION_NAME
        self.embedding_dim = embedding_dim
        self.client = None
        self.is_configured = False

        self._initialize_client()

    def _initialize_client(self) -> None:
        """Initialize Qdrant client connection."""
        if not QDRANT_AVAILABLE:
            logger.warning(
                "qdrant-client library not installed. "
                "RAG and semantic search will use mock responses. "
                "Install with: pip install qdrant-client>=1.9.0"
            )
            return

        if not self.qdrant_url or not self.qdrant_api_key:
            logger.warning(
                "Qdrant configuration incomplete. "
                "RAG and semantic search will use mock responses."
            )
            return

        try:
            self.client = QdrantClient(
                url=self.qdrant_url,
                api_key=self.qdrant_api_key,
                timeout=30.0,
            )
            
            info = self.client.get_collections()
            self.is_configured = True
            logger.info(f"Successfully connected to Qdrant at {self.qdrant_url}")
            logger.info(f"   Collections found: {len(info.collections)}")

        except Exception as e:
            logger.error(f"Failed to connect to Qdrant: {str(e)}")
            logger.warning("   RAG features will operate in mock mode.")
            self.client = None
            self.is_configured = False

    def initialize_collection(self) -> bool:
        """
        Create or verify the collection exists.
        
        Returns:
            True if collection is ready, False otherwise
        """
        if not self.is_configured:
            logger.info(f"Mock: Collection '{self.collection_name}' initialized")
            return False

        try:
            # Try to get collection info
            collection_info = self.client.get_collection(self.collection_name)
            logger.info(
                f"✅ Collection '{self.collection_name}' found with "
                f"{collection_info.points_count} points"
            )
            return True

        except Exception as e:
            # Collection doesn't exist, try to create it
            try:
                logger.info(f"Creating collection '{self.collection_name}'...")
                self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=VectorParams(
                        size=self.embedding_dim,
                        distance=Distance.COSINE,
                    ),
                )
                logger.info(f"✅ Collection '{self.collection_name}' created successfully")
                return True

            except Exception as create_error:
                logger.error(
                    f"❌ Failed to create collection: {str(create_error)}"
                )
                return False

    def search_similar(
        self,
        query_vector: List[float],
        limit: int = 5,
        score_threshold: float = 0.5
    ) -> List[Dict[str, Any]]:
        """
        Search for similar documents using vector similarity.
        
        Args:
            query_vector: Query embedding vector
            limit: Maximum number of results to return
            score_threshold: Minimum similarity score (0-1)
            
        Returns:
            List of similar documents with scores
        """
        if not self.is_configured or not self.client:
            logger.info(f"Mock search: returning 3 default scheme results")
            return self._mock_search_results()

        try:
            results = self.client.search(
                collection_name=self.collection_name,
                query_vector=query_vector,
                limit=limit,
                score_threshold=score_threshold,
            )

            documents = []
            for result in results:
                documents.append({
                    "id": result.id,
                    "score": result.score,
                    "payload": result.payload if result.payload else {},
                })

            logger.info(f"✅ Found {len(documents)} similar documents")
            return documents

        except Exception as e:
            logger.error(f"❌ Search error: {str(e)}")
            return self._mock_search_results()

    def search_by_text(
        self,
        query_text: str,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Search using text query (requires converting text to vector).
        
        Args:
            query_text: Text query
            limit: Maximum results
            
        Returns:
            List of similar documents
        """
        if not self.is_configured:
            logger.info(f"Mock text search: '{query_text[:50]}...'")
            return self._mock_search_results()

        try:
            # Note: In production, convert query_text to vector using embeddings model
            # Example: from sentence_transformers import SentenceTransformer
            # model = SentenceTransformer('all-MiniLM-L6-v2')
            # query_vector = model.encode(query_text)
            
            mock_vector = self._text_to_mock_vector(query_text)
            return self.search_similar(mock_vector, limit=limit)

        except Exception as e:
            logger.error(f"❌ Text search error: {str(e)}")
            return self._mock_search_results()

    def add_documents(
        self,
        documents: List[Dict[str, Any]]
    ) -> bool:
        """
        Add documents to the vector database.
        
        Args:
            documents: List of documents with 'id', 'vector', and 'payload'
            
        Returns:
            True if successful, False otherwise
        """
        if not self.is_configured or not self.client:
            logger.info(f"Mock: Adding {len(documents)} documents to collection")
            return True

        try:
            points = [
                PointStruct(
                    id=doc["id"],
                    vector=doc["vector"],
                    payload=doc.get("payload", {}),
                )
                for doc in documents
            ]

            self.client.upsert(
                collection_name=self.collection_name,
                points=points,
            )

            logger.info(f"✅ Added {len(documents)} documents to collection")
            return True

        except Exception as e:
            logger.error(f"❌ Failed to add documents: {str(e)}")
            return False

    def delete_documents(self, document_ids: List[int]) -> bool:
        """
        Delete documents from the collection.
        
        Args:
            document_ids: List of document IDs to delete
            
        Returns:
            True if successful, False otherwise
        """
        if not self.is_configured or not self.client:
            logger.info(f"Mock: Deleting {len(document_ids)} documents")
            return True

        try:
            self.client.delete(
                collection_name=self.collection_name,
                points_selector=document_ids,
            )

            logger.info(f"✅ Deleted {len(document_ids)} documents")
            return True

        except Exception as e:
            logger.error(f"❌ Failed to delete documents: {str(e)}")
            return False

    def get_collection_stats(self) -> Dict[str, Any]:
        """Get collection statistics."""
        if not self.is_configured or not self.client:
            return {
                "collection_name": self.collection_name,
                "status": "mock",
                "points_count": 0,
                "configured": False,
            }

        try:
            info = self.client.get_collection(self.collection_name)
            return {
                "collection_name": self.collection_name,
                "status": "ready",
                "points_count": info.points_count,
                "vectors_count": info.vectors_count,
                "configured": True,
            }

        except Exception as e:
            logger.error(f"❌ Failed to get stats: {str(e)}")
            return {
                "collection_name": self.collection_name,
                "status": "error",
                "error": str(e),
                "configured": False,
            }

    @staticmethod
    def _mock_search_results() -> List[Dict[str, Any]]:
        """Return mock search results for demo/testing."""
        return [
            {
                "id": 1,
                "score": 0.92,
                "payload": {
                    "scheme_name": "PM-KISAN",
                    "eligibility": "Small and marginal farmers",
                    "benefit": "₹6000 per year",
                }
            },
            {
                "id": 2,
                "score": 0.85,
                "payload": {
                    "scheme_name": "Ayushman Bharat",
                    "eligibility": "Below poverty line families",
                    "benefit": "₹5 lakh health insurance",
                }
            },
            {
                "id": 3,
                "score": 0.78,
                "payload": {
                    "scheme_name": "MGNREGA",
                    "eligibility": "Rural unemployed adults",
                    "benefit": "100 days wage employment",
                }
            },
        ]

    @staticmethod
    def _text_to_mock_vector(text: str, dim: int = 384) -> List[float]:
        """
        Create a mock embedding vector from text.
        
        In production, use a real embeddings model:
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer('all-MiniLM-L6-v2')
        vector = model.encode(text)
        """
        import hashlib
        
        # Generate pseudo-random vector based on text hash
        hash_obj = hashlib.md5(text.encode())
        seed = int(hash_obj.hexdigest()[:8], 16)
        
        import random
        random.seed(seed)
        
        # Generate normalized random vector
        vector = [random.gauss(0, 1) for _ in range(dim)]
        norm = sum(x**2 for x in vector) ** 0.5
        vector = [x / norm for x in vector]
        
        return vector


# Initialize global RAG client
rag_client = RagClient()
