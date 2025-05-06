import json
import numpy as np
import faiss
import torch
from PIL import Image
import clip
import os

def setup_clip_model(model_name="ViT-B/32"):
    """Set up a CLIP model for feature extraction."""
    print("[DEBUG] ➤ setup_clip_model: initializing model", model_name)
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print("[DEBUG] ➤ setup_clip_model: using device", device)
    model, preprocess = clip.load(model_name, device=device)
    print("[DEBUG] ➤ setup_clip_model: model loaded")
    return model, preprocess, device

def extract_clip_features(image, model, preprocess, device):
    """Extract feature vector from an image using CLIP."""
    print("[DEBUG] ➤ extract_clip_features: starting")
    if image is None:
        print("[DEBUG] ✖ extract_clip_features: image is None")
        return None

    image_tensor = preprocess(image).unsqueeze(0).to(device)
    print("[DEBUG] ➤ extract_clip_features: image preprocessed")

    with torch.no_grad():
        features = model.encode_image(image_tensor)
    print("[DEBUG] ➤ extract_clip_features: features extracted")

    features = features.cpu().numpy()
    features = features / np.linalg.norm(features, axis=1, keepdims=True)

    print("[DEBUG] ✔ extract_clip_features: done")
    return features.flatten()

def load_clip_index_and_metadata(index_path, metadata_path, mapping_path):
    """Load the FAISS index and product metadata for CLIP embeddings."""
    print("[DEBUG] ➤ load_clip_index_and_metadata: loading index and metadata")
    try:
        index = faiss.read_index(index_path)
        print("[DEBUG] ✔ FAISS index loaded")

        with open(metadata_path, 'r') as f:
            product_metadata = json.load(f)
        print("[DEBUG] ✔ Metadata loaded")

        with open(mapping_path, 'r') as f:
            mapping_data = json.load(f)
            embedding_to_product_map = {int(k): v for k, v in mapping_data.items()}
        print("[DEBUG] ✔ Embedding map loaded")

        return index, product_metadata, embedding_to_product_map
    except Exception as e:
        print(f"[ERROR] ✖ load_clip_index_and_metadata failed: {e}")
        return None, None, None


def search_similar_products_clip(query_image_path, top_k=5):
    print("[DEBUG] ➤ search_similar_products_clip: start")
    
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

    print("START")
    index_path = os.path.join(BASE_DIR, 'product_index_clip.faiss')
    metadata_path = os.path.join(BASE_DIR, 'product_metadata_clip.json')
    mapping_path = os.path.join(BASE_DIR, 'embedding_to_product_map_clip.json')
    print(index_path, ", ", metadata_path, ", ", mapping_path)
    
    try:
        print("[DEBUG] ➤ Loading CLIP model...")
        model, preprocess, device = setup_clip_model()

        print("[DEBUG] ➤ Loading FAISS index and metadata...")
        index, product_metadata, embedding_to_product_map = load_clip_index_and_metadata(index_path, metadata_path, mapping_path)
        if index is None or product_metadata is None:
            print("[ERROR] ➤ Failed to load index or metadata")
            return []

        print("[DEBUG] ➤ Opening query image...")
        query_image = Image.open(query_image_path).convert('RGB')

        print("[DEBUG] ➤ Extracting features...")
        query_features = extract_clip_features(query_image, model, preprocess, device)
        if query_features is None:
            print("[ERROR] ➤ Feature extraction failed.")
            return []

        print("[DEBUG] ➤ Searching FAISS index...")
        query_features = query_features.reshape(1, -1).astype('float32')
        scores, indices = index.search(query_features, top_k * 2)

        print("[DEBUG] ➤ Processing search results...")
        results = []
        seen_product_ids = set()

        for i, embedding_idx in enumerate(indices[0]):
            if embedding_idx < 0 or embedding_idx >= len(embedding_to_product_map):
                continue

            mapping = embedding_to_product_map[embedding_idx]
            product_id = mapping['product_id']
            image_idx = mapping['image_idx']

            if product_id in seen_product_ids:
                continue

            seen_product_ids.add(product_id)
            product = product_metadata[product_id]

            results.append({
                'product_id': product_id,
                'name': product['name'],
                'price': product['price'],
                'url': product['url'],
                'primary_image': product['image_urls'][image_idx],
                'all_images': product['image_urls'],
                'category': product['category'],
                'similarity_score': float(scores[0][i])
            })

            if len(results) >= top_k:
                break

        print(f"[DEBUG] ➤ Final results: {len(results)} items")
        results.sort(key=lambda x: x['similarity_score'], reverse=True)
        return results

    except Exception as e:
        import traceback
        print("[EXCEPTION] ➤ search_similar_products_clip crashed:")
        traceback.print_exc()
        raise e


def search_clip_with_text(text_query, top_k=5):
    """Search for products using a text query with CLIP."""
    # Load model
    model, preprocess, device = setup_clip_model()
    
    # Load index and metadata
    index, product_metadata, embedding_to_product_map = load_clip_index_and_metadata()
    if index is None or product_metadata is None:
        print("Failed to load index and metadata.")
        return []
    
    # Process text query with CLIP
    text = clip.tokenize([text_query]).to(device)
    
    with torch.no_grad():
        text_features = model.encode_text(text)
    
    # Normalize features to unit length
    text_features = text_features.cpu().numpy()
    text_features = text_features / np.linalg.norm(text_features, axis=1, keepdims=True)
    
    # Convert to correct format for FAISS
    text_features = text_features.astype('float32')
    
    # Search the index
    scores, indices = index.search(text_features, top_k * 2)
    
    # Process results to get unique products
    results = []
    seen_product_ids = set()
    
    for i, embedding_idx in enumerate(indices[0]):
        if embedding_idx < 0 or embedding_idx >= len(embedding_to_product_map):
            continue
            
        mapping = embedding_to_product_map[embedding_idx]
        product_id = mapping['product_id']
        image_idx = mapping['image_idx']
        
        # Skip if we've already included this product
        if product_id in seen_product_ids:
            continue
            
        seen_product_ids.add(product_id)
        
        # Get the product data
        product = product_metadata[product_id]
        
        results.append({
            'product_id': product_id,
            'name': product['name'],
            'price': product['price'],
            'url': product['url'],
            'primary_image': product['image_urls'][image_idx],
            'all_images': product['image_urls'],
            'category': product['category'],
            'similarity_score': float(scores[0][i])
        })
        
        # Stop once we have enough unique products
        if len(results) >= top_k:
            break
    
    # Sort by similarity score (highest first)
    results.sort(key=lambda x: x['similarity_score'], reverse=True)
    
    return results

# Example usage
if __name__ == "__main__":
    # Example: search using a query image
    query_image_path = "path_to_your_query_image.jpg"
    results = search_similar_products_clip(query_image_path, top_k=5)
    
    # Print results
    print(f"\nFound {len(results)} similar products:")
    for i, result in enumerate(results):
        print(f"\n{i+1}. {result['name']}")
        print(f"   Price: {result['price']}")
        print(f"   Similarity: {result['similarity_score']:.4f}")
        print(f"   Category: {result['category']}")
        print(f"   URL: {result['url']}")
        print(f"   Primary image: {result['primary_image']}")
        print(f"   Total images: {len(result['all_images'])}")
    
    # Example: search using text
    text_query = "blue shirt"
    text_results = search_clip_with_text(text_query, top_k=5)
    
    # Print text search results
    print(f"\nProducts matching '{text_query}':")
    for i, result in enumerate(text_results):
        print(f"\n{i+1}. {result['name']}")
        print(f"   Price: {result['price']}")
        print(f"   Similarity: {result['similarity_score']:.4f}")
        print(f"   Category: {result['category']}")