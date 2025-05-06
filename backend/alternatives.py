from fastapi import APIRouter, UploadFile, File, Form
from typing import List
import shutil
import uuid
import os

from clip_index.search_clip import search_similar_products_clip, search_clip_with_text


router = APIRouter()

@router.post("/search/alternatives/image")
async def search_alternatives_image(image: UploadFile = File(...)):
    tmp_path = f"/tmp/{uuid.uuid4()}.jpg"
    with open(tmp_path, "wb") as buffer:
        shutil.copyfileobj(image.file, buffer)

    results = search_similar_products_clip(tmp_path)
    os.remove(tmp_path)
    return results

@router.post("/search/alternatives/text")
async def search_alternatives_text(query: str = Form(...)):
    results = search_clip_with_text(query)
    return results