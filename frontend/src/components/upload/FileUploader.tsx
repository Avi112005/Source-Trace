"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, File, CheckCircle, AlertCircle, Loader2, X } from "lucide-react";
import { useSessionId } from "@/hooks/useSessionId";
import { cn } from "@/lib/utils";

type FileStatus = "idle" | "uploading" | "parsing" | "classifying" | "indexed" | "error";

interface FileItem {
  id: string;
  file: File;
  status: FileStatus;
  progress: number;
}

export function FileUploader() {
  const sessionId = useSessionId();
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<FileItem[]>([]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFiles = (newFiles: File[]) => {
    const newFileItems = newFiles.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      status: "idle" as FileStatus,
      progress: 0,
    }));
    
    setFiles(prev => [...prev, ...newFileItems]);
    
    // Start real upload process
    newFileItems.forEach(item => {
      uploadAndProcessFile(item.id, item.file);
    });
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const uploadAndProcessFile = async (id: string, file: File) => {
    const updateStatus = (status: FileStatus, progress: number) => {
      setFiles(prev => prev.map(f => f.id === id ? { ...f, status, progress } : f));
    };

    try {
      // 1. Upload
      updateStatus("uploading", 30);
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/documents/upload`, {
        method: "POST",
        headers: { "X-Session-Id": sessionId || "00000000-0000-0000-0000-000000000000" },
        body: formData,
      });

      if (!uploadRes.ok) throw new Error("Upload failed");
      const uploadData = await uploadRes.json();
      const fileId = uploadData.file_id;
      updateStatus("uploading", 100);

      // 2. Process (OCR, Classification, Embeddings)
      updateStatus("parsing", 40); 
      
      // Visually step through the statuses so the user sees the pipeline moving
      // (FastAPI handles parsing and classifying in one request, so we simulate the UI transition)
      const visualTimer = setTimeout(() => {
        updateStatus("classifying", 70);
      }, 2500);

      const processRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/documents/${fileId}/process`, {
        method: "POST",
        headers: { "X-Session-Id": sessionId || "00000000-0000-0000-0000-000000000000" }
      });
      clearTimeout(visualTimer);

      if (!processRes.ok) throw new Error("Processing failed");
      
      // Done
      updateStatus("indexed", 100);

    } catch (error) {
      console.error("File processing error:", error);
      updateStatus("error", 0);
    }
  };

  const getStatusIcon = (status: FileStatus) => {
    switch (status) {
      case "indexed": return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "error": return <AlertCircle className="w-5 h-5 text-destructive" />;
      default: return <Loader2 className="w-5 h-5 text-primary animate-spin" />;
    }
  };

  const getStatusText = (status: FileStatus) => {
    switch (status) {
      case "idle": return "Waiting...";
      case "uploading": return "Uploading...";
      case "parsing": return "Running OCR & Parsing...";
      case "classifying": return "LLM Classification...";
      case "indexed": return "Indexed Successfully";
      case "error": return "Processing Error";
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      {/* Dropzone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={cn(
          "relative border-2 border-dashed rounded-3xl p-12 text-center transition-all duration-300 ease-in-out bg-card/50 backdrop-blur-sm",
          isDragging 
            ? "border-primary bg-primary/5 scale-[1.02]" 
            : "border-border hover:border-primary/50 hover:bg-muted/50"
        )}
      >
        <input
          type="file"
          multiple
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          onChange={handleFileInput}
          accept=".pdf,.png,.jpg,.jpeg,.txt"
        />
        <div className="flex flex-col items-center justify-center space-y-4 pointer-events-none">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <UploadCloud className="w-10 h-10 text-primary" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-semibold">Drag & drop files here</h3>
            <p className="text-muted-foreground">or click to browse from your computer</p>
          </div>
          <div className="flex gap-2 mt-4 text-xs font-medium text-muted-foreground">
            <span className="px-3 py-1 bg-muted rounded-full">PDFs</span>
            <span className="px-3 py-1 bg-muted rounded-full">Images</span>
            <span className="px-3 py-1 bg-muted rounded-full">Text Files</span>
          </div>
        </div>
      </div>

      {/* File List */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <h4 className="font-semibold text-lg flex items-center justify-between">
              Processing Queue
              <span className="text-sm font-normal text-muted-foreground bg-muted px-3 py-1 rounded-full">
                {files.filter(f => f.status === "indexed").length} / {files.length} Complete
              </span>
            </h4>
            <div className="grid gap-3">
              {files.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="glass-card rounded-2xl p-4 flex items-center gap-4 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <File className="w-6 h-6 text-primary" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate pr-4">{item.file.name}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      {getStatusIcon(item.status)}
                      <span className={cn(
                        "text-xs font-medium",
                        item.status === "indexed" ? "text-green-500" :
                        item.status === "error" ? "text-destructive" :
                        "text-primary"
                      )}>
                        {getStatusText(item.status)}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {item.status === "indexed" || item.status === "error" ? (
                      <button
                        onClick={() => removeFile(item.id)}
                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    ) : (
                      <div className="text-xs font-semibold text-primary/80">
                        {item.progress}%
                      </div>
                    )}
                  </div>

                  {/* Progress Bar Background */}
                  {item.status !== "indexed" && item.status !== "error" && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted rounded-b-2xl overflow-hidden">
                      <motion.div
                        className="h-full bg-primary"
                        initial={{ width: "0%" }}
                        animate={{ width: `${item.progress}%` }}
                        transition={{ ease: "easeInOut", duration: 0.3 }}
                      />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
