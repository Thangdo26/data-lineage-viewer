const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.API_PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Base path for all CSV files - mounted from local ./public folder
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

console.log('Public directory:', PUBLIC_DIR);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    publicDir: PUBLIC_DIR,
    publicExists: fs.existsSync(PUBLIC_DIR)
  });
});

// Get schema by filename (query param)
app.get('/api/schema', (req, res) => {
  try {
    const filename = req.query.filename || 'schema.csv';
    
    // Security: prevent path traversal
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ success: false, error: 'Invalid filename' });
    }
    
    const schemaPath = path.join(PUBLIC_DIR, filename);
    
    if (fs.existsSync(schemaPath)) {
      const content = fs.readFileSync(schemaPath, 'utf-8');
      res.json({ success: true, content, filename });
    } else {
      res.json({ success: true, content: '', filename, message: 'File not found' });
    }
  } catch (error) {
    console.error('Error reading schema:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Save schema endpoint - supports dynamic filename
app.post('/api/save-schema', (req, res) => {
  try {
    const { csv, filename } = req.body;
    
    // Default filename if not provided
    const schemaFilename = filename || 'schema.csv';
    
    // Security: prevent path traversal
    if (schemaFilename.includes('..') || schemaFilename.includes('/')) {
      return res.status(400).json({ success: false, error: 'Invalid filename' });
    }
    
    const schemaPath = path.join(PUBLIC_DIR, schemaFilename);
    
    if (!csv) {
      return res.status(400).json({ 
        success: false, 
        error: 'No CSV content provided' 
      });
    }

    // Ensure directory exists
    if (!fs.existsSync(PUBLIC_DIR)) {
      fs.mkdirSync(PUBLIC_DIR, { recursive: true });
    }

    // Write new content directly (no backup as requested)
    fs.writeFileSync(schemaPath, csv, 'utf-8');
    
    console.log(`✅ Schema saved successfully at ${new Date().toISOString()}`);
    console.log(`   Filename: ${schemaFilename}`);
    console.log(`   Path: ${schemaPath}`);
    console.log(`   Size: ${csv.length} bytes`);
    
    res.json({ 
      success: true, 
      message: 'Schema saved successfully',
      filename: schemaFilename,
      path: schemaPath,
      size: csv.length
    });
  } catch (error) {
    console.error('❌ Error saving schema:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// List all schema files
app.get('/api/schemas', (req, res) => {
  try {
    if (!fs.existsSync(PUBLIC_DIR)) {
      return res.json({ success: true, files: [] });
    }
    
    const files = fs.readdirSync(PUBLIC_DIR);
    const schemaFiles = files.filter(f => f.startsWith('schema') && f.endsWith('.csv'));
    
    res.json({ success: true, files: schemaFiles });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// List all lineage files
app.get('/api/lineages', (req, res) => {
  try {
    if (!fs.existsSync(PUBLIC_DIR)) {
      return res.json({ success: true, files: [] });
    }
    
    const files = fs.readdirSync(PUBLIC_DIR);
    const lineageFiles = files.filter(f => f.startsWith('lineage') && f.endsWith('.csv'));
    
    res.json({ success: true, files: lineageFiles });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// List all CSV files in public directory
app.get('/api/files', (req, res) => {
  try {
    if (!fs.existsSync(PUBLIC_DIR)) {
      return res.json({ success: true, files: [] });
    }
    
    const files = fs.readdirSync(PUBLIC_DIR);
    const csvFiles = files.filter(f => f.endsWith('.csv'));
    
    const fileDetails = csvFiles.map(f => {
      const filePath = path.join(PUBLIC_DIR, f);
      const stats = fs.statSync(filePath);
      return {
        name: f,
        size: stats.size,
        modified: stats.mtime
      };
    });
    
    res.json({ success: true, files: fileDetails });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Schema API Server running on http://0.0.0.0:${PORT}`);
  console.log(`📁 Public directory: ${PUBLIC_DIR}`);
  console.log(`📂 Directory exists: ${fs.existsSync(PUBLIC_DIR)}`);
  
  // List files on startup
  if (fs.existsSync(PUBLIC_DIR)) {
    const files = fs.readdirSync(PUBLIC_DIR);
    console.log(`📄 Files in public: ${files.join(', ') || '(empty)'}`);
  }
});