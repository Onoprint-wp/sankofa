"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { Upload, X, FileText, Loader2, AlertCircle, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface FileUploadProps {
  bucket: "artwork-images" | "kyc-documents";
  value: string; // Storage path or full URL
  onChange: (value: string) => void;
  label?: string;
  accept?: string;
  maxSizeMB?: number;
}

export default function FileUpload({
  bucket,
  value,
  onChange,
  label = "Sélectionner un fichier",
  accept = "image/*",
  maxSizeMB = 10,
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to check file size and type
  const validateFile = (file: File): boolean => {
    setError(null);
    
    // Size validation
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`Le fichier est trop volumineux. Taille max : ${maxSizeMB} Mo.`);
      return false;
    }

    // Type validation
    if (accept.includes("image/*") && !file.type.startsWith("image/")) {
      setError("Seules les images sont acceptées.");
      return false;
    }

    if (bucket === "kyc-documents") {
      const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
      if (!allowedTypes.includes(file.type)) {
        setError("Seuls les formats JPG, PNG et PDF sont acceptés.");
        return false;
      }
    }

    return true;
  };

  const handleUpload = async (file: File) => {
    if (!validateFile(file)) return;

    setIsUploading(true);
    setError(null);

    try {
      const fileExt = file.name.split(".").pop();
      // Generate a unique file name to avoid collisions
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = fileName; // Upload straight to the root or subfolders if needed

      const { data, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // For public bucket, we retrieve public URL, for private bucket we save the path
      if (bucket === "artwork-images") {
        const { data: urlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(data.path);
        onChange(urlData.publicUrl);
      } else {
        onChange(data.path);
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err.message || "Une erreur est survenue lors du téléversement.");
    } finally {
      setIsUploading(false);
    }
  };

  // Drag handlers
  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleUpload(e.dataTransfer.files[0]);
    }
  };

  const handleChange = async (e: ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      await handleUpload(e.target.files[0]);
    }
  };

  const handleRemove = async () => {
    setError(null);
    onChange("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Check if value is a PDF file path
  const isPdf = value.toLowerCase().endsWith(".pdf") || value.toLowerCase().includes("pdf");
  // Check if we have a value to display
  const hasValue = !!value;

  // Render preview URL (signed urls are resolved in admin dashboard, but for local preview we can show a placeholder or name)
  const isPublicImage = bucket === "artwork-images" && hasValue;

  return (
    <div className="space-y-2 w-full">
      {hasValue ? (
        <div className="relative border border-border/80 rounded-xl overflow-hidden bg-card p-4 flex items-center justify-between shadow-sm animate-fadeIn">
          <div className="flex items-center gap-3">
            {isPublicImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={value}
                alt="Aperçu"
                className="w-16 h-16 object-cover rounded-lg border border-border/60"
              />
            ) : isPdf ? (
              <div className="w-16 h-16 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center text-red-500">
                <FileText className="w-8 h-8" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-lg bg-secondary/20 border border-border/60 flex items-center justify-center text-neutral">
                <ImageIcon className="w-8 h-8" />
              </div>
            )}
            
            <div className="overflow-hidden">
              <span className="text-xs font-semibold text-neutral block uppercase tracking-wider">
                Fichier chargé avec succès
              </span>
              <span className="text-[11px] text-neutral/70 truncate block max-w-[200px] sm:max-w-[300px]">
                {value.split("/").pop()}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRemove}
            className="p-1.5 rounded-full hover:bg-secondary/15 text-neutral hover:text-error transition-all"
            title="Supprimer le fichier"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[160px] ${
            dragActive
              ? "border-primary bg-primary/5 scale-[0.99]"
              : "border-border hover:border-primary hover:bg-secondary/10"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleChange}
            className="hidden"
          />

          {isUploading ? (
            <div className="flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-xs font-semibold text-neutral">Envoi du fichier en cours...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="p-3 bg-secondary/15 rounded-full text-neutral group-hover:text-primary transition-all">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-dark">{label}</p>
                <p className="text-[10px] text-neutral mt-1">
                  Glissez-déposez ou cliquez pour parcourir ({maxSizeMB} Mo max)
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-error text-xs mt-1.5 flex items-center gap-1.5 font-medium animate-fadeIn">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </p>
      )}
    </div>
  );
}
