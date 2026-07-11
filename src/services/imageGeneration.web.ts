export interface ImageGenerationReferenceImage {
  uri: string;
}

export interface ImageGenerationRequest {
  baseUrl: string;
  apiKey: string;
  model: string;
  prompt: string;
  size?: string;
  quality?: string;
  referenceImages?: ImageGenerationReferenceImage[];
  signal?: AbortSignal;
  onProgress?: (label: string) => void;
}

export interface ImageGenerationResult {
  imageUri: string;
  revisedPrompt?: string;
}

export async function generateOpenAIImage(_request: ImageGenerationRequest): Promise<ImageGenerationResult> {
  throw new Error('Web 暂未启用生图');
}

export async function deleteGeneratedImageFile(_imageUri?: string): Promise<void> {
  return undefined;
}

export async function saveGeneratedImageToLibrary(_imageUri: string): Promise<string> {
  throw new Error('Web 暂未启用保存到相册');
}
