'use client';

import React, { useCallback, useState, useRef, ChangeEvent } from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { X, Upload, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageUploadZoneProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
  maxSize?: number; // in bytes
  className?: string;
}

export function ImageUploadZone({
  images,
  onImagesChange,
  maxImages = 5,
  maxSize = 5 * 1024 * 1024, // 5MB default
  className = '',
}: ImageUploadZoneProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: string[] = [];
    const fileArray = Array.from(files);
    let hasError = false;
    
    fileArray.forEach((file) => {
      if (file.size > maxSize) {
        console.error(`File ${file.name} is too large`);
        toast({
          title: 'File too large',
          description: `${file.name} exceeds ${Math.floor(maxSize / (1024 * 1024))}MB limit`,
          variant: 'destructive',
        });
        hasError = true;
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        newImages.push(result);
        
        if (newImages.length === fileArray.filter(f => f.size <= maxSize).length) {
          const allImages = [...images, ...newImages].slice(0, maxImages);
          onImagesChange(allImages);
          
          if (!hasError) {
            toast({
              title: 'Images uploaded',
              description: `Added ${newImages.length} image${newImages.length > 1 ? 's' : ''}`,
            });
          }
        }
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (!files || images.length >= maxImages) return;

    const fileArray = Array.from(files).filter(file => file.type.startsWith('image/'));
    const newImages: string[] = [];
    let hasError = false;
    
    fileArray.forEach((file) => {
      if (file.size > maxSize) {
        console.error(`File ${file.name} is too large`);
        toast({
          title: 'File too large',
          description: `${file.name} exceeds ${Math.floor(maxSize / (1024 * 1024))}MB limit`,
          variant: 'destructive',
        });
        hasError = true;
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        newImages.push(result);
        
        if (newImages.length === fileArray.filter(f => f.size <= maxSize).length) {
          const allImages = [...images, ...newImages].slice(0, maxImages);
          onImagesChange(allImages);
          
          if (!hasError) {
            toast({
              title: 'Images added',
              description: `Added ${newImages.length} image${newImages.length > 1 ? 's' : ''}`,
            });
          }
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemove = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

  const handleImageDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleImageDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleImageDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    const newImages = [...images];
    const [draggedImage] = newImages.splice(draggedIndex, 1);
    newImages.splice(dropIndex, 0, draggedImage);
    
    onImagesChange(newImages);
    setDraggedIndex(null);
  };

  // Check if device has camera (mobile)
  const hasCamera = typeof navigator !== 'undefined' && 
    'mediaDevices' in navigator && 
    'getUserMedia' in navigator.mediaDevices;

  const handleCameraCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      // Create video element to capture image
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();

      // Wait for video to be ready
      await new Promise((resolve) => {
        video.onloadedmetadata = resolve;
      });

      // Create canvas and capture frame
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);

      // Stop stream
      stream.getTracks().forEach(track => track.stop());

      // Convert to data URL and add to images
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      const newImages = [...images, imageDataUrl].slice(0, maxImages);
      onImagesChange(newImages);
      
      toast({
        title: 'Photo captured',
        description: 'Your photo has been added successfully',
      });
    } catch (error) {
      console.error('Camera capture failed:', error);
      
      // Provide user-friendly error messages
      let errorMessage = 'Could not access camera';
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Camera access was denied. Please allow camera access in your browser settings.';
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'No camera found on this device.';
        } else if (error.name === 'NotReadableError') {
          errorMessage = 'Camera is already in use by another application.';
        }
      }
      
      toast({
        title: 'Camera Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Uploaded Images Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {images.map((image, index) => (
            <div
              key={index}
              draggable
              onDragStart={() => handleImageDragStart(index)}
              onDragOver={(e) => handleImageDragOver(e, index)}
              onDrop={(e) => handleImageDrop(e, index)}
              className={cn(
                'relative aspect-square rounded-lg overflow-hidden bg-muted group cursor-move',
                draggedIndex === index && 'opacity-50'
              )}
            >
              <Image
                src={image}
                alt={`Product image ${index + 1}`}
                fill
                className="object-cover"
              />
              {index === 0 && (
                <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded">
                  Main
                </div>
              )}
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleRemove(index)}
                aria-label="Remove image"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Upload Zone */}
      {images.length < maxImages && (
        <Card className={cn(
          'border-2 border-dashed transition-colors',
          isDragging ? 'border-primary bg-primary/5' : 'border-border'
        )}>
          <CardContent className="p-6">
            <div
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="text-center space-y-4 cursor-pointer"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                multiple
                onChange={handleFileChange}
                className="sr-only"
              />
              <div className="flex justify-center">
                <div className="rounded-full bg-muted p-4">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {isDragging ? 'Drop images here' : 'Drag & drop images here'}
                </p>
                <p className="text-xs text-muted-foreground">
                  or click to browse ({images.length}/{maxImages})
                </p>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG, WEBP up to {Math.floor(maxSize / (1024 * 1024))}MB
                </p>
              </div>
            </div>

            {/* Camera Button for Mobile */}
            {hasCamera && (
              <div className="mt-4 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCameraCapture();
                  }}
                >
                  <Camera className="h-4 w-4" />
                  Take Photo
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {images.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Drag images to reorder. First image will be the main product image.
        </p>
      )}
    </div>
  );
}
