#!/bin/bash

echo "íº€ Setting up Data Lineage Viewer..."

# Create project structure
mkdir -p data-lineage-viewer/{src/components,public,nginx}
cd data-lineage-viewer

# Create package.json
cat > package.json << 'EOF'
{
  "name": "data-lineage-viewer",
  "version": "1.0.0",
  "description": "Data Lineage Visualization Tool",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "lucide-react": "^0.263.1",
    "papaparse": "^5.4.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.0",
    "autoprefixer": "^10.4.14",
    "postcss": "^8.4.24",
    "tailwindcss": "^3.3.2",
    "vite": "^4.3.9"
  }
}
EOF

# Install dependencies
echo "í³¦ Installing dependencies..."
npm install

# Initialize Tailwind
echo "í¾¨ Initializing Tailwind CSS..."
npx tailwindcss init -p

echo "âœ… Setup complete!"
echo "í³ Next steps:"
echo "1. Copy all source files to appropriate directories"
echo "2. Place your lineage.csv in public/ folder"
echo "3. Run: npm run dev"
