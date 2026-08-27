from typing import List

from fastapi import FastAPI
from pydantic import BaseModel
from sentence_transformers import CrossEncoder
import torch

print("PyTorch:", torch.__version__)
print(
    "MPS available:",
    torch.backends.mps.is_available(),
)
print(
    "MPS built:",
    torch.backends.mps.is_built(),
)

MODEL_NAME = "Qwen/Qwen3-Reranker-0.6B"


app = FastAPI(
    title="AI Workspace Reranker",
    version="1.0.0",
)

device = (
    "mps"
    if torch.backends.mps.is_available()
    else "cpu"
)

print("Reranker device:", device)

model = CrossEncoder(
    MODEL_NAME,
    device=device,
)

class RerankDocument(BaseModel):
    id: str
    content: str


class RerankRequest(BaseModel):
    query: str
    documents: List[RerankDocument]
    top_k: int = 5


class RerankResult(BaseModel):
    id: str
    score: float


class RerankResponse(BaseModel):
    results: List[RerankResult]


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model": MODEL_NAME,
    }


@app.post(
    "/rerank",
    response_model=RerankResponse,
)
def rerank(
    request: RerankRequest,
):
    if not request.documents:
        return RerankResponse(
            results=[],
        )

    pairs = [
        (
            request.query,
            document.content,
        )
        for document
        in request.documents
    ]

    scores = model.predict(
        pairs,
    )

    ranked = sorted(
        [
            RerankResult(
                id=document.id,
                score=float(score),
            )
            for document, score
            in zip(
                request.documents,
                scores,
            )
        ],
        key=lambda item:
            item.score,
        reverse=True,
    )

    return RerankResponse(
        results=ranked[
            : request.top_k
        ],
    )
