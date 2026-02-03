/**
 * Canvas Operation Node Handlers
 * 
 * Handlers for canvas operation nodes: tile, filter, combine, rotate, colorPalette
 */

import type { NodeHandlerContext } from './index';
import type { Extract } from '../../types/nodes';
import type { NodeOutput } from '../../stores/workflow';

export async function handleTile(context: NodeHandlerContext): Promise<void> {
  const { nodeData, inputs, setNodeOutput, node } = context;
  const data = nodeData as Extract<NodeDataUnion, { nodeType: 'tile' }>;
  const imageInput = inputs.find((i) => i.type === 'image');
  if (!imageInput) {
    throw new Error('Missing image input');
  }

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = imageInput.data;
  });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  const mode = data.mode ?? 'seamless';
  const repeatX = data.repeatX ?? 2;
  const repeatY = data.repeatY ?? 2;
  const blendAmount = data.blendAmount ?? 0.25;

  if (mode === 'seamless') {
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, img.width, img.height);
    const pixels = imageData.data;
    const blendPixels = Math.floor(img.width * blendAmount);

    for (let y = 0; y < img.height; y++) {
      for (let x = 0; x < blendPixels; x++) {
        const alpha = x / blendPixels;
        const leftIdx = (y * img.width + x) * 4;
        const rightIdx = (y * img.width + (img.width - blendPixels + x)) * 4;

        for (let c = 0; c < 4; c++) {
          const leftVal = pixels[leftIdx + c];
          const rightVal = pixels[rightIdx + c];
          const blended = leftVal * alpha + rightVal * (1 - alpha);
          pixels[leftIdx + c] = blended;
          pixels[rightIdx + c] = leftVal * (1 - alpha) + rightVal * alpha;
        }
      }
    }

    const blendPixelsV = Math.floor(img.height * blendAmount);
    for (let x = 0; x < img.width; x++) {
      for (let y = 0; y < blendPixelsV; y++) {
        const alpha = y / blendPixelsV;
        const topIdx = (y * img.width + x) * 4;
        const bottomIdx = ((img.height - blendPixelsV + y) * img.width + x) * 4;

        for (let c = 0; c < 4; c++) {
          const topVal = pixels[topIdx + c];
          const bottomVal = pixels[bottomIdx + c];
          const blended = topVal * alpha + bottomVal * (1 - alpha);
          pixels[topIdx + c] = blended;
          pixels[bottomIdx + c] = topVal * (1 - alpha) + bottomVal * alpha;
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
  } else if (mode === 'repeat') {
    canvas.width = img.width * repeatX;
    canvas.height = img.height * repeatY;

    for (let x = 0; x < repeatX; x++) {
      for (let y = 0; y < repeatY; y++) {
        ctx.drawImage(img, x * img.width, y * img.height);
      }
    }
  } else if (mode === 'mirror') {
    canvas.width = img.width * 2;
    canvas.height = img.height * 2;

    ctx.drawImage(img, 0, 0);

    ctx.save();
    ctx.translate(img.width * 2, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(img, 0, 0);
    ctx.restore();

    ctx.save();
    ctx.translate(0, img.height * 2);
    ctx.scale(1, -1);
    ctx.drawImage(img, 0, 0);
    ctx.restore();

    ctx.save();
    ctx.translate(img.width * 2, img.height * 2);
    ctx.scale(-1, -1);
    ctx.drawImage(img, 0, 0);
    ctx.restore();
  }

  setNodeOutput(node.id, {
    type: 'image',
    data: canvas.toDataURL('image/png'),
    timestamp: Date.now(),
  });
}

export async function handleColorPalette(context: NodeHandlerContext): Promise<void> {
  const { nodeData, inputs, setNodeOutput, node } = context;
  const data = nodeData as Extract<NodeDataUnion, { nodeType: 'colorPalette' }>;
  const imageInput = inputs.find((i) => i.type === 'image');
  if (!imageInput) {
    throw new Error('Missing image input');
  }

  const PALETTES: Record<string, string[]> = {
    gameboy: ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'],
    nes: [
      '#000000', '#fcfcfc', '#f8f8f8', '#bcbcbc', '#7c7c7c', '#a4e4fc', '#3cbcfc',
      '#0078f8', '#0000fc', '#b8b8f8', '#6888fc', '#0058f8', '#0000bc', '#d8b8f8',
      '#9878f8', '#6844fc', '#4428bc', '#f8b8f8', '#f878f8', '#d800cc', '#940084',
      '#f8a4c0', '#f85898', '#e40058', '#a80020', '#f0d0b0', '#f87858', '#f83800',
      '#a81000', '#fce0a8', '#fca044', '#e45c10', '#881400', '#f8d878', '#f8b800',
      '#ac7c00', '#503000', '#d8f878', '#b8f818', '#00b800', '#007800', '#b8f8b8',
      '#58d854', '#00a800', '#006800', '#b8f8d8', '#58f898', '#00a844', '#005800',
      '#00fcfc', '#00e8d8', '#008888', '#004058', '#f8d8f8', '#787878',
    ],
    pico8: [
      '#000000', '#1d2b53', '#7e2553', '#008751', '#ab5236', '#5f574f', '#c2c3c7',
      '#fff1e8', '#ff004d', '#ffa300', '#ffec27', '#00e436', '#29adff', '#83769c',
      '#ff77a8', '#ffccaa',
    ],
    cga: ['#000000', '#00aaaa', '#aa00aa', '#aaaaaa'],
    grayscale: ['#000000', '#555555', '#aaaaaa', '#ffffff'],
    sepia: ['#2b1d0e', '#5c4033', '#8b7355', '#d4b896', '#f5e6d3'],
    neon: ['#ff00ff', '#00ffff', '#ff00aa', '#00ff00', '#ffff00', '#ff5500'],
    pastel: ['#ffb3ba', '#ffdfba', '#ffffba', '#baffc9', '#bae1ff', '#e0b3ff'],
  };

  const paletteName = data.palette ?? 'pico8';
  const palette = PALETTES[paletteName] ?? PALETTES.pico8;
  const dithering = data.dithering ?? false;

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = imageInput.data;
  });

  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, img.width, img.height);
  const pixels = imageData.data;

  const findClosestColor = (r: number, g: number, b: number): string => {
    let minDist = Infinity;
    let closest = palette[0];

    for (const color of palette) {
      const pr = parseInt(color.slice(1, 3), 16);
      const pg = parseInt(color.slice(3, 5), 16);
      const pb = parseInt(color.slice(5, 7), 16);
      const dist = Math.sqrt(
        2 * (r - pr) ** 2 + 4 * (g - pg) ** 2 + 3 * (b - pb) ** 2
      );
      if (dist < minDist) {
        minDist = dist;
        closest = color;
      }
    }

    return closest;
  };

  if (dithering) {
    const errors: number[][] = [];
    for (let i = 0; i < img.height; i++) {
      errors[i] = new Array(img.width * 3).fill(0);
    }

    for (let y = 0; y < img.height; y++) {
      for (let x = 0; x < img.width; x++) {
        const idx = (y * img.width + x) * 4;

        let r = pixels[idx] + (errors[y]?.[x * 3] || 0);
        let g = pixels[idx + 1] + (errors[y]?.[x * 3 + 1] || 0);
        let b = pixels[idx + 2] + (errors[y]?.[x * 3 + 2] || 0);

        r = Math.max(0, Math.min(255, r));
        g = Math.max(0, Math.min(255, g));
        b = Math.max(0, Math.min(255, b));

        const closest = findClosestColor(r, g, b);
        const nr = parseInt(closest.slice(1, 3), 16);
        const ng = parseInt(closest.slice(3, 5), 16);
        const nb = parseInt(closest.slice(5, 7), 16);

        const errR = r - nr;
        const errG = g - ng;
        const errB = b - nb;

        const distribute = (dx: number, dy: number, factor: number) => {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < img.width && ny >= 0 && ny < img.height) {
            if (!errors[ny]) errors[ny] = new Array(img.width * 3).fill(0);
            errors[ny][nx * 3] = (errors[ny][nx * 3] || 0) + errR * factor;
            errors[ny][nx * 3 + 1] = (errors[ny][nx * 3 + 1] || 0) + errG * factor;
            errors[ny][nx * 3 + 2] = (errors[ny][nx * 3 + 2] || 0) + errB * factor;
          }
        };

        distribute(1, 0, 7 / 16);
        distribute(-1, 1, 3 / 16);
        distribute(0, 1, 5 / 16);
        distribute(1, 1, 1 / 16);

        pixels[idx] = nr;
        pixels[idx + 1] = ng;
        pixels[idx + 2] = nb;
      }
    }
  } else {
    for (let i = 0; i < pixels.length; i += 4) {
      const closest = findClosestColor(pixels[i], pixels[i + 1], pixels[i + 2]);
      pixels[i] = parseInt(closest.slice(1, 3), 16);
      pixels[i + 1] = parseInt(closest.slice(3, 5), 16);
      pixels[i + 2] = parseInt(closest.slice(5, 7), 16);
    }
  }

  ctx.putImageData(imageData, 0, 0);

  setNodeOutput(node.id, {
    type: 'image',
    data: canvas.toDataURL('image/png'),
    timestamp: Date.now(),
  });
}

export async function handleFilter(context: NodeHandlerContext): Promise<void> {
  const { nodeData, inputs, setNodeOutput, node } = context;
  const data = nodeData as Extract<NodeDataUnion, { nodeType: 'filter' }>;
  const imageInput = inputs.find((i) => i.type === 'image');
  if (!imageInput) {
    throw new Error('Missing image input');
  }

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = imageInput.data;
  });

  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;

  const filter = data.filter ?? 'grayscale';
  const intensity = data.intensity ?? 100;

  if (['grayscale', 'sepia', 'brightness', 'contrast', 'saturate', 'blur'].includes(filter)) {
    let filterValue = '';
    switch (filter) {
      case 'grayscale':
        filterValue = `grayscale(${intensity}%)`;
        break;
      case 'sepia':
        filterValue = `sepia(${intensity}%)`;
        break;
      case 'brightness':
        filterValue = `brightness(${intensity}%)`;
        break;
      case 'contrast':
        filterValue = `contrast(${intensity}%)`;
        break;
      case 'saturate':
        filterValue = `saturate(${intensity}%)`;
        break;
      case 'blur':
        filterValue = `blur(${intensity / 10}px)`;
        break;
    }
    ctx.filter = filterValue;
    ctx.drawImage(img, 0, 0);
  } else if (filter === 'invert') {
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, img.width, img.height);
    const pixels = imageData.data;
    const factor = intensity / 100;

    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = pixels[i] + (255 - 2 * pixels[i]) * factor;
      pixels[i + 1] = pixels[i + 1] + (255 - 2 * pixels[i + 1]) * factor;
      pixels[i + 2] = pixels[i + 2] + (255 - 2 * pixels[i + 2]) * factor;
    }
    ctx.putImageData(imageData, 0, 0);
  } else if (filter === 'sharpen') {
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, img.width, img.height);
    const pixels = imageData.data;
    const factor = intensity / 100;

    const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
    const tempData = new Uint8ClampedArray(pixels);

    for (let y = 1; y < img.height - 1; y++) {
      for (let x = 1; x < img.width - 1; x++) {
        for (let c = 0; c < 3; c++) {
          let sum = 0;
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const idx = ((y + ky) * img.width + (x + kx)) * 4 + c;
              sum += tempData[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
            }
          }
          const idx = (y * img.width + x) * 4 + c;
          pixels[idx] = tempData[idx] + (sum - tempData[idx]) * factor;
        }
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }

  setNodeOutput(node.id, {
    type: 'image',
    data: canvas.toDataURL('image/png'),
    timestamp: Date.now(),
  });
}

export async function handleCombine(context: NodeHandlerContext): Promise<void> {
  const { nodeData, edges, nodeOutputs, setNodeOutput, node } = context;
  const data = nodeData as Extract<NodeDataUnion, { nodeType: 'combine' }>;
  const incomingEdges = edges.filter((e) => e.target === node.id);
  const inputImages = incomingEdges
    .map((e) => nodeOutputs[e.source])
    .filter((output): output is NodeOutput => output !== undefined && output.type === 'image');

  if (inputImages.length < 2) {
    throw new Error('Combine node needs at least 2 image inputs');
  }

  const images = await Promise.all(
    inputImages.map(
      (input) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = input.data;
        })
    )
  );

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  const mode = (data.mode ?? 'overlay') as
    | 'overlay'
    | 'side-by-side'
    | 'grid'
    | 'vertical'
    | 'stack';
  const alignment = data.alignment ?? 'center';
  const spacing = data.spacing ?? 0;

  if (mode === 'overlay') {
    const maxWidth = Math.max(...images.map((img) => img.width));
    const maxHeight = Math.max(...images.map((img) => img.height));
    canvas.width = maxWidth;
    canvas.height = maxHeight;

    for (const img of images) {
      let x = 0;
      let y = 0;
      if (alignment === 'center') {
        x = (maxWidth - img.width) / 2;
        y = (maxHeight - img.height) / 2;
      } else if (alignment === 'top-right') {
        x = maxWidth - img.width;
      } else if (alignment === 'bottom-left') {
        y = maxHeight - img.height;
      } else if (alignment === 'bottom-right') {
        x = maxWidth - img.width;
        y = maxHeight - img.height;
      }
      ctx.drawImage(img, x, y);
    }
  } else if (mode === 'side-by-side') {
    const totalWidth =
      images.reduce((sum, img) => sum + img.width, 0) + spacing * (images.length - 1);
    const maxHeight = Math.max(...images.map((img) => img.height));
    canvas.width = totalWidth;
    canvas.height = maxHeight;

    let x = 0;
    for (const img of images) {
      const y = alignment.includes('top')
        ? 0
        : alignment.includes('bottom')
          ? maxHeight - img.height
          : (maxHeight - img.height) / 2;
      ctx.drawImage(img, x, y);
      x += img.width + spacing;
    }
  } else if (mode === 'grid') {
    const cols = 2;
    const rows = Math.ceil(images.length / cols);
    const cellWidth = Math.max(...images.map((img) => img.width));
    const cellHeight = Math.max(...images.map((img) => img.height));
    canvas.width = cellWidth * cols + spacing * (cols - 1);
    canvas.height = cellHeight * rows + spacing * (rows - 1);

    images.forEach((img, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = col * (cellWidth + spacing) + (cellWidth - img.width) / 2;
      const y = row * (cellHeight + spacing) + (cellHeight - img.height) / 2;
      ctx.drawImage(img, x, y);
    });
  } else if (mode === 'vertical' || mode === 'stack') {
    const maxWidth = Math.max(...images.map((img) => img.width));
    const totalHeight =
      images.reduce((sum, img) => sum + img.height, 0) + spacing * (images.length - 1);
    canvas.width = maxWidth;
    canvas.height = totalHeight;

    let y = 0;
    for (const img of images) {
      const x = alignment.includes('left')
        ? 0
        : alignment.includes('right')
          ? maxWidth - img.width
          : (maxWidth - img.width) / 2;
      ctx.drawImage(img, x, y);
      y += img.height + spacing;
    }
  }

  setNodeOutput(node.id, {
    type: 'image',
    data: canvas.toDataURL('image/png'),
    timestamp: Date.now(),
  });
}

export async function handleRotate(context: NodeHandlerContext): Promise<void> {
  const { nodeData, inputs, setNodeOutput, node } = context;
  const data = nodeData as Extract<NodeDataUnion, { nodeType: 'rotate' }>;
  const imageInput = inputs.find((i) => i.type === 'image');
  if (!imageInput) {
    throw new Error('Missing image input');
  }

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = imageInput.data;
  });

  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const directions = data.directions ?? 4;

  const cols = 4;
  const rows = directions === 4 ? 1 : 2;
  const canvas = document.createElement('canvas');
  canvas.width = w * cols;
  canvas.height = h * rows;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const angleStep = 360 / directions;
  for (let i = 0; i < directions; i++) {
    const angle = i * angleStep;
    const col = i % cols;
    const row = Math.floor(i / cols);
    const centerX = col * w + w / 2;
    const centerY = row * h + h / 2;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate((angle * Math.PI) / 180);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  setNodeOutput(node.id, {
    type: 'image',
    data: canvas.toDataURL('image/png'),
    timestamp: Date.now(),
  });
}
