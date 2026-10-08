import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  LinearProgress,
  Alert
} from '@mui/material';
import {
  Paperclip as AttachFile,
  Trash2 as Delete,
  Eye as Visibility,
  Download,
  Upload as CloudUpload,
  FileText as Description,
  Image,
  FileText as PictureAsPdf
} from 'lucide-react';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db, storage } from '../config/firebase';

const EvidenceUpload = ({ treatmentPlan, onUpdate }) => {
  const [uploadDialog, setUploadDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewDialog, setPreviewDialog] = useState(false);
  const [previewEvidence, setPreviewEvidence] = useState(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];

      if (!allowedTypes.includes(file.type)) {
        alert('Jenis file tidak didukung. Gunakan PDF, Word, Excel, atau gambar.');
        return;
      }

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        alert('Ukuran file maksimal 10MB');
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      setUploadProgress(0);

      // Create storage reference
      const fileExtension = selectedFile.name.split('.').pop();
      const fileName = `evidence_${Date.now()}.${fileExtension}`;
      const storageRef = ref(storage, `treatment_evidence/${treatmentPlan.id}/${fileName}`);

      // Upload file
      const uploadTask = uploadBytesResumable(storageRef, selectedFile);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          alert('Error uploading file: ' + error.message);
          setUploading(false);
        },
        async () => {
          // Upload completed
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

          // Create evidence object
          const evidence = {
            id: Date.now().toString(),
            filename: selectedFile.name,
            url: downloadURL,
            uploadDate: new Date().toISOString(),
            fileType: selectedFile.type,
            fileSize: selectedFile.size,
            storagePath: uploadTask.snapshot.ref.fullPath
          };

          // Update treatment plan in Firestore
          await updateDoc(doc(db, 'treatment_plans', treatmentPlan.id), {
            evidence: arrayUnion(evidence),
            updatedAt: new Date()
          });

          // Call parent update
          onUpdate({ evidence: [...(treatmentPlan.evidence || []), evidence] });

          setUploading(false);
          setUploadProgress(0);
          setSelectedFile(null);
          setUploadDialog(false);
        }
      );
    } catch (error) {
      alert('Error uploading file: ' + error.message);
      setUploading(false);
    }
  };

  const handleDeleteEvidence = async (evidence) => {
    if (!window.confirm(`Hapus evidence "${evidence.filename}"?`)) return;

    try {
      // Delete from storage
      const storageRef = ref(storage, evidence.storagePath);
      await deleteObject(storageRef);

      // Update Firestore
      await updateDoc(doc(db, 'treatment_plans', treatmentPlan.id), {
        evidence: arrayRemove(evidence),
        updatedAt: new Date()
      });

      // Call parent update
      const updatedEvidence = (treatmentPlan.evidence || []).filter(e => e.id !== evidence.id);
      onUpdate({ evidence: updatedEvidence });

    } catch (error) {
      alert('Error deleting evidence: ' + error.message);
    }
  };

  const handlePreview = (evidence) => {
    setPreviewEvidence(evidence);
    setPreviewDialog(true);
  };

  const handleDownload = (evidence) => {
    const link = document.createElement('a');
    link.href = evidence.url;
    link.download = evidence.filename;
    link.click();
  };

  const getFileIcon = (fileType) => {
    if (fileType.includes('image')) return <Image color="primary" size={20} />;
    if (fileType.includes('pdf')) return <PictureAsPdf color="error" size={20} />;
    return <Description color="action" size={20} />;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Evidence & Dokumen Pendukung
            </Typography>
            <Button
              startIcon={<CloudUpload size={20} />}
              variant="contained"
              size="small"
              onClick={() => setUploadDialog(true)}
            >
              Upload Evidence
            </Button>
          </Box>

          {(!treatmentPlan.evidence || treatmentPlan.evidence.length === 0) ? (
            <Alert severity="info">
              Belum ada evidence yang diupload. Upload bukti implementasi treatment plan.
            </Alert>
          ) : (
            <List>
              {treatmentPlan.evidence.map((evidence) => (
                <ListItem
                  key={evidence.id}
                  secondaryAction={
                    <Box>
                      <IconButton
                        edge="end"
                        aria-label="view"
                        onClick={() => handlePreview(evidence)}
                      >
                        <Visibility size={20} />
                      </IconButton>
                      <IconButton
                        edge="end"
                        aria-label="download"
                        onClick={() => handleDownload(evidence)}
                      >
                        <Download size={20} />
                      </IconButton>
                      <IconButton
                        edge="end"
                        aria-label="delete"
                        onClick={() => handleDeleteEvidence(evidence)}
                        color="error"
                      >
                        <Delete size={20} />
                      </IconButton>
                    </Box>
                  }
                >
                  <ListItemIcon>
                    {getFileIcon(evidence.fileType)}
                  </ListItemIcon>
                  <ListItemText
                    primary={evidence.filename}
                    secondary={
                      <Box sx={{ mt: 0.5 }}>
                        <Chip
                          label={new Date(evidence.uploadDate).toLocaleDateString('id-ID')}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          label={formatFileSize(evidence.fileSize)}
                          size="small"
                          variant="outlined"
                          sx={{ ml: 1 }}
                        />
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={uploadDialog} onClose={() => !uploading && setUploadDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Upload Evidence</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              id="evidence-upload"
            />
            <label htmlFor="evidence-upload">
              <Button
                variant="outlined"
                component="span"
                startIcon={<AttachFile size={20} />}
                fullWidth
                sx={{ mb: 2 }}
              >
                Pilih File
              </Button>
            </label>

            {selectedFile && (
              <Box sx={{ p: 2, border: '1px dashed', borderColor: 'primary.main', borderRadius: 1 }}>
                <Typography variant="body2">
                  <strong>File:</strong> {selectedFile.name}
                </Typography>
                <Typography variant="body2">
                  <strong>Size:</strong> {formatFileSize(selectedFile.size)}
                </Typography>
                <Typography variant="body2">
                  <strong>Type:</strong> {selectedFile.type}
                </Typography>
              </Box>
            )}

            {uploading && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Uploading... {Math.round(uploadProgress)}%
                </Typography>
                <LinearProgress variant="determinate" value={uploadProgress} />
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setUploadDialog(false)}
            disabled={uploading}
          >
            Batal
          </Button>
          <Button
            variant="contained"
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            startIcon={<CloudUpload size={20} />}
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog
        open={previewDialog}
        onClose={() => setPreviewDialog(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Preview Evidence: {previewEvidence?.filename}
        </DialogTitle>
        <DialogContent>
          {previewEvidence && (
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              {previewEvidence.fileType.includes('image') ? (
                <img
                  src={previewEvidence.url}
                  alt={previewEvidence.filename}
                  style={{ maxWidth: '100%', maxHeight: '400px' }}
                />
              ) : (
                <Box sx={{ p: 4 }}>
                  <Description size={64} color="#64748b" style={{ marginBottom: 16 }} />
                  <Typography variant="h6" gutterBottom>
                    {previewEvidence.filename}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    File tidak dapat dipreview. Silakan download untuk melihat.
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<Download size={20} />}
                    onClick={() => handleDownload(previewEvidence)}
                    sx={{ mt: 2 }}
                  >
                    Download File
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialog(false)}>Tutup</Button>
          {previewEvidence && (
            <Button
              variant="contained"
              startIcon={<Download size={20} />}
              onClick={() => handleDownload(previewEvidence)}
            >
              Download
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};

export default EvidenceUpload;