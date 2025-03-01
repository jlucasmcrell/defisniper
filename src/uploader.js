// File upload management with chunking and retry support
class UploaderManager {
    constructor() {
        this.uploads = new Map();
        this.listeners = new Set();
        this.chunkSize = 1024 * 1024; // 1MB
        this.maxConcurrentUploads = 3;
        this.maxRetries = 3;
        this.supportedTypes = new Set([
            'image/jpeg',
            'image/png',
            'image/gif',
            'application/pdf',
            'text/plain',
            'text/csv'
        ]);
        this.activeUploads = 0;
        this.queue = [];
        this.initialized = false;
    }

    async initialize() {
        try {
            // Check browser compatibility
            if (!this.checkCompatibility()) {
                throw new Error('Browser does not support required upload features');
            }

            this.initialized = true;
            return true;
        } catch (error) {
            console.error('Failed to initialize uploader:', error);
            return false;
        }
    }

    checkCompatibility() {
        return 'File' in window && 
               'Blob' in window && 
               'FileReader' in window && 
               'Promise' in window;
    }

    upload(file, options = {}) {
        return new Promise((resolve, reject) => {
            if (!this.initialized) {
                reject(new Error('Uploader not initialized'));
                return;
            }

            if (!this.validateFile(file)) {
                reject(new Error('Invalid file type or size'));
                return;
            }

            const uploadId = this.generateUploadId();
            const upload = {
                id: uploadId,
                file,
                options: {
                    endpoint: options.endpoint || '/api/upload',
                    chunkSize: options.chunkSize || this.chunkSize,
                    retries: options.retries || this.maxRetries,
                    onProgress: options.onProgress || (() => {}),
                    metadata: options.metadata || {}
                },
                status: 'pending',
                progress: 0,
                chunks: [],
                activeChunks: new Set(),
                completedChunks: new Set(),
                resolve,
                reject
            };

            this.uploads.set(uploadId, upload);
            this.prepareUpload(upload);
            this.processQueue();

            return uploadId;
        });
    }

    validateFile(file) {
        return this.supportedTypes.has(file.type);
    }

    prepareUpload(upload) {
        const { file, options } = upload;
        const chunks = Math.ceil(file.size / options.chunkSize);

        for (let i = 0; i < chunks; i++) {
            const start = i * options.chunkSize;
            const end = Math.min(start + options.chunkSize, file.size);
            
            upload.chunks.push({
                index: i,
                start,
                end,
                retries: 0,
                status: 'pending'
            });
        }

        if (this.activeUploads < this.maxConcurrentUploads) {
            this.startUpload(upload);
        } else {
            this.queue.push(upload);
        }
    }

    async startUpload(upload) {
        try {
            this.activeUploads++;
            upload.status = 'uploading';
            this.notifyListeners('start', upload);

            // Initialize upload
            const initResponse = await fetch(upload.options.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Upload-ID': upload.id
                },
                body: JSON.stringify({
                    filename: upload.file.name,
                    size: upload.file.size,
                    type: upload.file.type,
                    chunks: upload.chunks.length,
                    metadata: upload.options.metadata
                })
            });

            if (!initResponse.ok) {
                throw new Error('Failed to initialize upload');
            }

            // Upload chunks
            await this.uploadChunks(upload);

            // Finalize upload
            const finalizeResponse = await fetch(`${upload.options.endpoint}/finalize`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Upload-ID': upload.id
                }
            });

            if (!finalizeResponse.ok) {
                throw new Error('Failed to finalize upload');
            }

            const result = await finalizeResponse.json();
            upload.status = 'completed';
            this.notifyListeners('complete', upload);
            upload.resolve(result);
        } catch (error) {
            upload.status = 'failed';
            this.notifyListeners('error', { upload, error });
            upload.reject(error);
        } finally {
            this.activeUploads--;
            this.uploads.delete(upload.id);
            this.processQueue();
        }
    }

    async uploadChunks(upload) {
        const chunkPromises = upload.chunks.map(chunk => 
            this.uploadChunk(upload, chunk)
        );
        await Promise.all(chunkPromises);
    }

    async uploadChunk(upload, chunk) {
        while (chunk.retries < upload.options.retries) {
            try {
                const chunkBlob = upload.file.slice(chunk.start, chunk.end);
                
                const response = await fetch(`${upload.options.endpoint}/chunk`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/octet-stream',
                        'X-Upload-ID': upload.id,
                        'X-Chunk-Index': chunk.index
                    },
                    body: chunkBlob
                });

                if (!response.ok) {
                    throw new Error(`Chunk upload failed: ${response.status}`);
                }

                chunk.status = 'completed';
                upload.completedChunks.add(chunk.index);
                this.updateProgress(upload);
                return;
            } catch (error) {
                chunk.retries++;
                if (chunk.retries >= upload.options.retries) {
                    throw new Error(`Failed to upload chunk ${chunk.index} after ${chunk.retries} attempts`);
                }
                await new Promise(resolve => setTimeout(resolve, 1000 * chunk.retries));
            }
        }
    }

    updateProgress(upload) {
        const progress = (upload.completedChunks.size / upload.chunks.length) * 100;
        upload.progress = Math.round(progress);
        upload.options.onProgress(upload.progress);
        this.notifyListeners('progress', upload);
    }

    processQueue() {
        while (this.activeUploads < this.maxConcurrentUploads && this.queue.length > 0) {
            const upload = this.queue.shift();
            this.startUpload(upload);
        }
    }

    cancel(uploadId) {
        const upload = this.uploads.get(uploadId);
        if (upload) {
            upload.status = 'cancelled';
            this.notifyListeners('cancel', upload);
            upload.reject(new Error('Upload cancelled'));
            this.uploads.delete(uploadId);
            this.processQueue();
        }
    }

    addListener(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    notifyListeners(event, data) {
        this.listeners.forEach(listener => {
            try {
                listener(event, data);
            } catch (error) {
                console.error('Error in upload listener:', error);
            }
        });
    }

    generateUploadId() {
        return `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    setChunkSize(size) {
        this.chunkSize = size;
    }

    setSupportedTypes(types) {
        this.supportedTypes = new Set(types);
    }

    setMaxConcurrentUploads(max) {
        this.maxConcurrentUploads = max;
    }

    isInitialized() {
        return this.initialized;
    }
}

// Create and export global uploader instance
export const uploader = new UploaderManager();