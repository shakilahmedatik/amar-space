import os
import re

SERVICES_DIR = "old_api_src/services"
NEW_SERVICES_DIR = "lib/services"
ROUTES_DIR = "old_api_src/routes"
NEW_ROUTES_DIR = "app/api"

# Ensure directories exist
os.makedirs(NEW_SERVICES_DIR, exist_ok=True)

# 1. Refactor services
for filename in os.listdir(SERVICES_DIR):
    if not filename.endswith(".ts"): continue
    
    filepath = os.path.join(SERVICES_DIR, filename)
    with open(filepath, "r") as f:
        content = f.read()
    
    # Remove fastify import
    content = re.sub(r"import type { FastifyInstance } from 'fastify'\n?", "", content)
    
    # Add db and auth imports
    if "fastify.db" in content or "db" not in content:
        content = "import { db } from '@/lib/db'\n" + content
    if "fastify.auth" in content and "auth" not in content:
        content = "import { auth } from '@/lib/auth'\n" + content
        
    # Replace fastify references
    content = content.replace("fastify.db.", "db.")
    content = content.replace("fastify.auth.", "auth.")
    content = content.replace("fastify: FastifyInstance,", "")
    content = content.replace("fastify: FastifyInstance", "")
    content = re.sub(r'export async function (\w+)\(\s*fastify: FastifyInstance,?\s*', r'export async function \1(', content)
    
    new_filepath = os.path.join(NEW_SERVICES_DIR, filename)
    with open(new_filepath, "w") as f:
        f.write(content)

print("Services refactored.")
