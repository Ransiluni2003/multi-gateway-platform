/**
 * Secure File Upload/Download Test Page
 * 
 * Demonstrates:
 * 1. Generate signed upload URL
 * 2. Upload file directly to Supabase
 * 3. Generate signed download URL
 * 4. Download file (URL expires after 1 hour)
 */

'use client';

import { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Alert,
  Stepper,
  Step,
  StepLabel,
  TextField,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DownloadIcon from '@mui/icons-material/Download';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

export default function SecureStorageTestPage() {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadUrl, setUploadUrl] = useState('');
  const [filePath, setFilePath] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState('');

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${message}`]);
  };

  // Step 1: Generate Upload URL
  const generateUploadUrl = async () => {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }

    addLog(`Requesting upload URL for ${selectedFile.name}...`);
    setError('');

    try {
      const response = await fetch('/api/storage/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: selectedFile.name,
          fileType: selectedFile.type,
          fileSize: selectedFile.size,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate upload URL');
      }

      setUploadUrl(data.uploadUrl);
      setFilePath(data.filePath);
      setExpiresAt(data.expiresAt);
      addLog(`✅ Upload URL generated (expires at ${new Date(data.expiresAt).toLocaleTimeString()})`);
      setActiveStep(1);
    } catch (err: any) {
      setError(err.message);
      addLog(`❌ Error: ${err.message}`);
    }
  };

  // Step 2: Upload File
  const uploadFile = async () => {
    if (!selectedFile || !uploadUrl) {
      setError('Missing file or upload URL');
      return;
    }

    addLog('Uploading file to Supabase...');
    setError('');

    try {
      // Upload directly to Supabase using signed URL
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        body: selectedFile,
        headers: {
          'Content-Type': selectedFile.type,
        },
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      setUploadProgress(100);
      addLog('✅ File uploaded successfully!');
      setActiveStep(2);
    } catch (err: any) {
      setError(err.message);
      addLog(`❌ Upload error: ${err.message}`);
    }
  };

  // Step 3: Generate Download URL
  const generateDownloadUrl = async () => {
    if (!filePath) {
      setError('No file path available');
      return;
    }

    addLog('Requesting download URL...');
    setError('');

    try {
      const response = await fetch('/api/storage/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate download URL');
      }

      setDownloadUrl(data.downloadUrl);
      setExpiresAt(data.expiresAt);
      addLog(`✅ Download URL generated (expires at ${new Date(data.expiresAt).toLocaleTimeString()})`);
      setActiveStep(3);
    } catch (err: any) {
      setError(err.message);
      addLog(`❌ Error: ${err.message}`);
    }
  };

  // Step 4: Download File
  const downloadFile = () => {
    if (downloadUrl) {
      addLog('Opening file in new tab...');
      window.open(downloadUrl, '_blank');
      addLog('✅ File opened successfully!');
    }
  };

  const reset = () => {
    setActiveStep(0);
    setSelectedFile(null);
    setUploadUrl('');
    setFilePath('');
    setUploadProgress(0);
    setDownloadUrl('');
    setExpiresAt('');
    setError('');
    setLogs([]);
  };

  const steps = [
    'Select File & Generate Upload URL',
    'Upload File to Supabase',
    'Generate Download URL',
    'Download File',
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box mb={4}>
        <Typography variant="h4" gutterBottom>
          🔒 Secure File Storage Test
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Demonstrates secure file upload/download using signed URLs
        </Typography>
      </Box>

      {/* Security Info */}
      <Card sx={{ mb: 3, bgcolor: 'info.light' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            🛡️ Security Features Demonstrated
          </Typography>
          <ul>
            <li><strong>Permission Check:</strong> Only admins can upload files</li>
            <li><strong>File Validation:</strong> Type and size limits enforced</li>
            <li><strong>Signed URLs:</strong> Time-limited URLs (expire after 1 hour)</li>
            <li><strong>Direct Upload:</strong> Files go directly to Supabase (not through your server)</li>
            <li><strong>Access Control:</strong> Can only download files you own (unless admin)</li>
          </ul>
        </CardContent>
      </Card>

      {/* Progress Stepper */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Step 0: Select File */}
        {activeStep === 0 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Step 1: Select File & Generate Upload URL
            </Typography>
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setSelectedFile(file);
                  addLog(`File selected: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
                }
              }}
              style={{ marginBottom: 16 }}
            />
            {selectedFile && (
              <Box mb={2}>
                <Chip label={`${selectedFile.name} - ${(selectedFile.size / 1024).toFixed(2)} KB`} />
              </Box>
            )}
            <Button
              variant="contained"
              onClick={generateUploadUrl}
              disabled={!selectedFile}
              startIcon={<CloudUploadIcon />}
            >
              Generate Upload URL
            </Button>
          </Box>
        )}

        {/* Step 1: Upload File */}
        {activeStep === 1 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Step 2: Upload File
            </Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              Upload URL generated! Valid until {new Date(expiresAt).toLocaleString()}
            </Alert>
            <Button
              variant="contained"
              onClick={uploadFile}
              startIcon={<CloudUploadIcon />}
            >
              Upload to Supabase
            </Button>
            {uploadProgress > 0 && uploadProgress < 100 && (
              <LinearProgress variant="determinate" value={uploadProgress} sx={{ mt: 2 }} />
            )}
          </Box>
        )}

        {/* Step 2: Generate Download URL */}
        {activeStep === 2 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Step 3: Generate Download URL
            </Typography>
            <Alert severity="success" sx={{ mb: 2 }}>
              ✅ File uploaded successfully!
            </Alert>
            <Typography variant="body2" sx={{ mb: 2 }}>
              File Path: <code>{filePath}</code>
            </Typography>
            <Button
              variant="contained"
              onClick={generateDownloadUrl}
              startIcon={<DownloadIcon />}
            >
              Generate Download URL
            </Button>
          </Box>
        )}

        {/* Step 3: Download File */}
        {activeStep === 3 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Step 4: Download File
            </Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              Download URL generated! Valid until {new Date(expiresAt).toLocaleString()}
            </Alert>
            <Box display="flex" gap={2}>
              <Button
                variant="contained"
                onClick={downloadFile}
                startIcon={<DownloadIcon />}
              >
                Open File
              </Button>
              <Button variant="outlined" onClick={reset}>
                Start Over
              </Button>
            </Box>
            <Alert severity="success" sx={{ mt: 2 }}>
              <Typography variant="subtitle2">
                ✅ Complete! You've demonstrated:
              </Typography>
              <ul>
                <li>Permission-checked upload URL generation</li>
                <li>Direct upload to Supabase (bypassing your server)</li>
                <li>Time-limited download URL (expires in 1 hour)</li>
                <li>Secure file access control</li>
              </ul>
            </Alert>
          </Box>
        )}
      </Paper>

      {/* Activity Logs */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Activity Logs
        </Typography>
        <List dense>
          {logs.length === 0 ? (
            <ListItem>
              <ListItemText secondary="No activity yet..." />
            </ListItem>
          ) : (
            logs.map((log, index) => (
              <ListItem key={index}>
                <ListItemText 
                  primary={log}
                  primaryTypographyProps={{ 
                    variant: 'body2',
                    fontFamily: 'monospace',
                  }}
                />
              </ListItem>
            ))
          )}
        </List>
      </Paper>

      {/* Explanation */}
      <Box mt={4}>
        <Typography variant="h5" gutterBottom>
          📚 How Signed URLs Work
        </Typography>

        <Paper sx={{ p: 3, mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            🎯 The Problem (Without Signed URLs)
          </Typography>
          <Typography variant="body2" paragraph>
            Traditional approach: Upload file to your server, server saves to storage
          </Typography>
          <ul>
            <li>❌ Large files slow down your server</li>
            <li>❌ Public URLs work forever (no expiration)</li>
            <li>❌ Anyone with URL can access file</li>
            <li>❌ Hard to revoke access</li>
          </ul>
        </Paper>

        <Paper sx={{ p: 3, mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            🛡️ The Solution (With Signed URLs)
          </Typography>
          <Typography variant="body2" paragraph>
            Modern approach: Generate time-limited URL, client uploads directly
          </Typography>
          <ol>
            <li>Client requests upload URL from your API</li>
            <li>API checks permissions (is user admin?)</li>
            <li>API generates signed URL (valid for 1 hour)</li>
            <li>Client uploads file directly to Supabase</li>
            <li>URL expires after 1 hour → secure!</li>
          </ol>
          <Typography variant="body2" sx={{ mt: 2 }}>
            <strong>Benefits:</strong>
          </Typography>
          <ul>
            <li>✅ Faster uploads (direct to storage)</li>
            <li>✅ Time-limited access (URLs expire)</li>
            <li>✅ Permission-controlled (check before generating URL)</li>
            <li>✅ Less server load (files don't go through your server)</li>
          </ul>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            💡 Real-World Use Case: Product Images
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>Scenario:</strong> Admin uploads product image
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>Without Signed URLs:</strong>
          </Typography>
          <ul>
            <li>1. Admin uploads 10MB image to your server</li>
            <li>2. Your server processes it (CPU/memory usage)</li>
            <li>3. Your server uploads to storage</li>
            <li>4. Public URL: https://storage/image.jpg</li>
            <li>5. ❌ Anyone can hotlink this URL forever</li>
          </ul>
          <Typography variant="body2" paragraph>
            <strong>With Signed URLs:</strong>
          </Typography>
          <ul>
            <li>1. Admin requests upload URL (with permission check)</li>
            <li>2. Gets signed URL valid for 1 hour</li>
            <li>3. Browser uploads 10MB directly to Supabase</li>
            <li>4. Your server never touches the file!</li>
            <li>5. ✅ Download URL expires after 1 hour</li>
          </ul>
        </Paper>
      </Box>

      {/* Loom Instructions */}
      <Alert severity="success" sx={{ mt: 4 }}>
        <Typography variant="subtitle2" gutterBottom>
          📹 For Loom Recording:
        </Typography>
        <ol style={{ marginLeft: 16, marginTop: 8 }}>
          <li>Select a test image file (cat.jpg, test.png, etc.)</li>
          <li>Click "Generate Upload URL" → show success message</li>
          <li>Click "Upload to Supabase" → show progress</li>
          <li>Click "Generate Download URL" → show expiration time</li>
          <li>Click "Open File" → file opens in new tab</li>
          <li>Explain: "URL expires in 1 hour, then stops working"</li>
          <li>Total time: ~2 minutes</li>
        </ol>
      </Alert>
    </Container>
  );
}
