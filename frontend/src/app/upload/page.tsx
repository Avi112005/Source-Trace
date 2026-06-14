import { FileUploader } from "@/components/upload/FileUploader";

export default function UploadPage() {
  return (
    <div className="flex-1 w-full flex flex-col items-center pt-12 pb-8">
      <div className="text-center mb-12 space-y-4 max-w-2xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          Knowledge Base Ingestion
        </h1>
        <p className="text-lg text-muted-foreground">
          Upload documents to expand the intelligence of your agent. The system automatically extracts text, parses tables, and runs OCR on images.
        </p>
      </div>
      
      <FileUploader />
    </div>
  );
}
