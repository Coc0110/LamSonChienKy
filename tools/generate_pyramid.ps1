$code = @'
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;

public class PyramidSlicer {
    public static void GeneratePyramid(string inputPath, string outputBaseDir, int tileSize, long quality) {
        using (Bitmap original = new Bitmap(inputPath)) {
            int origW = original.Width;
            int origH = original.Height;
            int maxZoom = 4; // Zoom 4 is 100% full original resolution (8960x11776)

            ImageCodecInfo jpgEncoder = null;
            foreach (ImageCodecInfo codec in ImageCodecInfo.GetImageEncoders()) {
                if (codec.FormatID == ImageFormat.Jpeg.Guid) {
                    jpgEncoder = codec;
                    break;
                }
            }
            EncoderParameters encoderParams = new EncoderParameters(1);
            encoderParams.Param[0] = new EncoderParameter(Encoder.Quality, quality);

            for (int z = maxZoom; z >= 0; z--) {
                double scale = Math.Pow(0.5, maxZoom - z);
                int curW = (int)Math.Round(origW * scale);
                int curH = (int)Math.Round(origH * scale);

                Console.WriteLine("Generating Zoom " + z + ": " + curW + "x" + curH + " (scale " + scale + ")...");
                string zoomDir = Path.Combine(outputBaseDir, z.ToString());
                if (!Directory.Exists(zoomDir)) {
                    Directory.CreateDirectory(zoomDir);
                }

                // If z == maxZoom, use original directly; otherwise resize
                Bitmap currentImg = null;
                if (z == maxZoom) {
                    currentImg = original;
                } else {
                    currentImg = new Bitmap(curW, curH, PixelFormat.Format24bppRgb);
                    using (Graphics g = Graphics.FromImage(currentImg)) {
                        g.InterpolationMode = InterpolationMode.HighQualityBicubic;
                        g.PixelOffsetMode = PixelOffsetMode.HighQuality;
                        g.DrawImage(original, 0, 0, curW, curH);
                    }
                }

                int cols = (int)Math.Ceiling((double)curW / tileSize);
                int rows = (int)Math.Ceiling((double)curH / tileSize);

                for (int c = 0; c < cols; c++) {
                    string colDir = Path.Combine(zoomDir, c.ToString());
                    if (!Directory.Exists(colDir)) {
                        Directory.CreateDirectory(colDir);
                    }

                    for (int r = 0; r < rows; r++) {
                        int x = c * tileSize;
                        int y = r * tileSize;
                        int w = Math.Min(tileSize, curW - x);
                        int h = Math.Min(tileSize, curH - y);

                        using (Bitmap tile = new Bitmap(tileSize, tileSize, PixelFormat.Format24bppRgb)) {
                            using (Graphics g = Graphics.FromImage(tile)) {
                                g.Clear(Color.FromArgb(22, 23, 26)); // Dark map background
                                g.InterpolationMode = InterpolationMode.HighQualityBicubic;
                                g.DrawImage(currentImg, new Rectangle(0, 0, w, h), new Rectangle(x, y, w, h), GraphicsUnit.Pixel);
                            }
                            string tilePath = Path.Combine(colDir, r + ".jpg");
                            tile.Save(tilePath, jpgEncoder, encoderParams);
                        }
                    }
                }

                if (z != maxZoom) {
                    currentImg.Dispose();
                }
            }
            Console.WriteLine("Pyramid tiling completed successfully!");
        }
    }
}
'@

Add-Type -TypeDefinition $code -ReferencedAssemblies System.Drawing
$inImg = (Resolve-Path "raw_assets/vietnam_full_map_reference.jpg").Path
$outDir = Join-Path (Resolve-Path "public").Path "tiles"

# Remove old tiles if any
if (Test-Path $outDir) {
    Remove-Item -Path $outDir -Recurse -Force
}

[PyramidSlicer]::GeneratePyramid($inImg, $outDir, 512, 85)
