# File Upload

RapidoJS provides built-in support for handling multipart form data and file uploads through decorators and plugins. This feature is powered by the `@fastify/multipart` plugin and provides a clean, decorator-based API for handling file uploads.

## Quick Start

### Basic Setup

To enable file upload functionality in your application, you need to enable multipart support:

```typescript
import { RapidoFactory } from '@rapidojs/core';
import { AppModule } from './app.module';

const app = await RapidoFactory.create(AppModule);

// Enable multipart support
app.enableMultipart();

await app.listen(3000);
```

### Single File Upload

```typescript
import { Controller, Post, UseMultipart, UploadedFile } from '@rapidojs/common';
import type { MultipartFile } from '@rapidojs/common';

@Controller('/api/upload')
export class UploadController {
  @Post('/single')
  @UseMultipart()
  uploadSingle(@UploadedFile() file: MultipartFile) {
    console.log('Uploaded file:', {
      filename: file.filename,
      mimetype: file.mimetype,
      size: file.buffer.length
    });

    return {
      message: 'File uploaded successfully',
      filename: file.filename,
      size: file.buffer.length,
      mimetype: file.mimetype
    };
  }
}
```

### Multiple Files Upload

```typescript
@Controller('/api/upload')
export class UploadController {
  @Post('/multiple')
  @UseMultipart()
  uploadMultiple(@UploadedFiles() files: MultipartFile[]) {
    console.log(`Received ${files.length} files`);

    return {
      message: 'Files uploaded successfully',
      count: files.length,
      files: files.map(file => ({
        filename: file.filename,
        size: file.buffer.length,
        mimetype: file.mimetype
      }))
    };
  }
}
```

### Upload with Form Data

You can combine file uploads with other form data:

```typescript
@Controller('/api/upload')
export class UploadController {
  @Post('/with-data')
  @UseMultipart()
  uploadWithData(
    @UploadedFile() file: MultipartFile,
    @Body() formData: any
  ) {
    return {
      file: {
        filename: file.filename,
        size: file.buffer.length,
        mimetype: file.mimetype
      },
      metadata: formData
    };
  }
}
```

## API Reference

### Decorators

#### `@UseMultipart()`

Enables multipart form data processing for a specific route handler.

```typescript
@Post('/upload')
@UseMultipart()
uploadFile(@UploadedFile() file: MultipartFile) {
  // Handle file upload
}
```

#### `@UploadedFile(fieldName?: string)`

Extracts a single uploaded file from the request.

**Parameters:**
- `fieldName` (optional): The name of the form field containing the file. If not specified, uses the first file found.

```typescript
// Extract file from any field
@UploadedFile() file: MultipartFile

// Extract file from specific field
@UploadedFile('avatar') avatar: MultipartFile
```

#### `@UploadedFiles(fieldName?: string)`

Extracts multiple uploaded files from the request.

**Parameters:**
- `fieldName` (optional): The name of the form field containing the files. If not specified, returns all files.

```typescript
// Extract all files
@UploadedFiles() files: MultipartFile[]

// Extract files from specific field
@UploadedFiles('documents') documents: MultipartFile[]
```

### Types

#### `MultipartFile`

Represents an uploaded file with the following properties:

```typescript
interface MultipartFile {
  /** The original filename */
  filename: string;
  
  /** The MIME type of the file */
  mimetype: string;
  
  /** The file content as a Buffer */
  buffer: Buffer;
  
  /** The encoding used for the file */
  encoding: string;
  
  /** The size of the file in bytes */
  size: number;
}
```

## Advanced Usage

### File Validation

You can implement custom validation for uploaded files:

```typescript
import { BadRequestException } from '@rapidojs/core';

@Controller('/api/upload')
export class UploadController {
  @Post('/image')
  @UseMultipart()
  uploadImage(@UploadedFile() file: MultipartFile) {
    // Validate file type
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Only image files are allowed');
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.buffer.length > maxSize) {
      throw new BadRequestException('File size exceeds 5MB limit');
    }

    return {
      message: 'Image uploaded successfully',
      filename: file.filename,
      size: file.buffer.length
    };
  }
}
```

### Saving Files to Disk

```typescript
import { promises as fs } from 'fs';
import { join } from 'path';

@Controller('/api/upload')
export class UploadController {
  @Post('/save')
  @UseMultipart()
  async saveFile(@UploadedFile() file: MultipartFile) {
    const uploadDir = './uploads';
    const filePath = join(uploadDir, file.filename);

    // Ensure upload directory exists
    await fs.mkdir(uploadDir, { recursive: true });

    // Save file to disk
    await fs.writeFile(filePath, file.buffer);

    return {
      message: 'File saved successfully',
      path: filePath,
      filename: file.filename
    };
  }
}
```

### Processing Images

```typescript
import sharp from 'sharp';

@Controller('/api/upload')
export class UploadController {
  @Post('/image/resize')
  @UseMultipart()
  async resizeImage(@UploadedFile() file: MultipartFile) {
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Only image files are allowed');
    }

    // Resize image to 300x300
    const resizedBuffer = await sharp(file.buffer)
      .resize(300, 300)
      .jpeg({ quality: 80 })
      .toBuffer();

    return {
      message: 'Image resized successfully',
      originalSize: file.buffer.length,
      resizedSize: resizedBuffer.length,
      filename: file.filename
    };
  }
}
```

## Configuration

### Multipart Options

You can configure multipart handling options when enabling the feature:

```typescript
const app = await RapidoFactory.create(AppModule);

// Enable with custom options
app.enableMultipart({
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB file size limit
    files: 5,                   // Maximum 5 files
    fieldSize: 1024 * 1024      // 1MB field size limit
  }
});
```

### Available Options

- `limits.fileSize`: Maximum file size in bytes
- `limits.files`: Maximum number of files
- `limits.fieldSize`: Maximum field value size in bytes
- `limits.fieldNameSize`: Maximum field name size in bytes
- `limits.fields`: Maximum number of non-file fields

## Error Handling

Common errors and how to handle them:

```typescript
@Controller('/api/upload')
export class UploadController {
  @Post('/safe')
  @UseMultipart()
  safeUpload(@UploadedFile() file: MultipartFile) {
    try {
      if (!file) {
        throw new BadRequestException('No file uploaded');
      }

      // Process file...
      return { success: true };
    } catch (error) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        throw new BadRequestException('File too large');
      }
      if (error.code === 'LIMIT_FILE_COUNT') {
        throw new BadRequestException('Too many files');
      }
      throw error;
    }
  }
}
```

## Best Practices

1. **Always validate file types and sizes** to prevent security issues
2. **Use appropriate file size limits** to prevent abuse
3. **Sanitize file names** before saving to disk
4. **Store files outside the web root** for security
5. **Consider using cloud storage** for production applications
6. **Implement virus scanning** for uploaded files in production
7. **Use streaming** for large file uploads when possible

## Examples

For complete examples, check out the [example-api](../apps/example-api) application which includes working file upload endpoints.

## Dependencies

The file upload functionality requires the `@fastify/multipart` package, which is automatically included as an optional dependency in the `@rapidojs/core` package. No additional installation is required.