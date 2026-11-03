# Flare 16-frame motion experiment

赛博朋克和黑客帝国各生成 16 张关键帧，使用用户选定的 `gpt-image-2.5-flare`，通过已配置的 OpenAI Python `OpenAI()` 接口调用。每个效果分四次参考图编辑请求，每次返回一张 2×2 帧图；原始输出全部保留。

源码模拟以 30 FPS 运行，采样第 0、2、4……30 帧。生成图按每秒 15 张不同画面播放，较上一轮每秒 3.75 张提高四倍。每轮包含约 1.067 秒内容；MP4 正向重复四轮，总长约 4.267 秒。GIF 因时间单位限制使用 60/70 ms 交替停留，总长 1.070 秒。未使用光流插帧或原生视频模型。

| 文件 | 内容 |
| --- | --- |
| `*-dense15.gif` / `*-dense15.mp4` | 16 帧新版本，768×512 |
| `*-density-comparison.gif` / `*-density-comparison.mp4` | 左侧从本轮取四帧、每帧停留四步；右侧播放全部 16 帧。两侧使用同一批图和相同后处理，比较时间采样密度，不是旧版成图与新版的比较 |
| `frames/<style>-000.png` … `015.png` | 对齐、固定机身内区后的逐帧图；编号为播放序号，对应源码帧编号乘二 |
| `raw/` | 八张未经处理的模型输出，1536×1024，每张四帧 |
| `controls/`、`source-frames.json` | 模拟器实际 RGB、40 逻辑灯位及左右映射控制图 |
| `prompts/`、`manifest.json` | 八次请求的完整提示词、模型参数、参考图路径、源码和输出哈希 |
| `*-freeze-mask.png` | 白色固定机身内区，黑色保留灯效/背景变化，灰色为羽化边界 |
| `*-contact-sheet.jpg` | 每个效果的 16 帧总览，按行阅读 |
| `verification.json` | 对齐变换、匹配内点、固定区差异及相邻帧 RGB 差异 |

提示词先映射源码的空间行为，再加入同一系列的表现规则：赛博朋克为品红/青色分组沿灯带变化和短暂局部故障闪点；黑客帝国为独立绿色灯点激活、衰减，背景下落数字雨是主题表达，不能理解为灯带上的追逐运动。每次编辑都输入原详情图、当前四帧源码控制图、上一轮 Flare 帧图，保持无人机结构与背景语言。

后处理使用中性桨罩特征做 ORB/RANSAC 对齐，再把第一帧的机身中部和四个桨罩内区固定到后续帧，外围灯带和背景继续变化。32 张 PNG 的固定掩膜核心区差异均为零；16 张图均为不同图像。这个检查不代表整个无人机轮廓或 GIF/MP4 压缩后的每个像素都固定。

目前仍是动效备选：四组生成图之间存在背景纹理和灯光状态的跳变，结束回到第一帧也有切换接缝；增加帧数减少了组内停顿，但尚未达到无缝连续视频。AI 对控制图的亮灭、RGB 和运动距离仍是近似表达。相邻帧 RGB 平均绝对差为赛博朋克 9.61、黑客帝国 6.89；该数值仅供排查突变，不是运动质量评分。

## 复现

在仓库根目录运行，需要 Node、Python（Pillow、NumPy、OpenCV）、FFmpeg，以及已配置的 OpenAI Python 环境。

```powershell
npm run build
node scripts/prepare-flare-dense.mjs
python scripts/prepare-flare-dense.py

$denseRoot = 'assets/effects/generated-keyframe-experiments/flare-dense16'
$imageCli = Join-Path $env:USERPROFILE '.codex/skills/.system/imagegen/scripts/image_gen.py'
foreach ($style in @('styleCyberpunk', 'styleMatrix')) {
    foreach ($group in 0..3) {
        $part = '{0:D2}' -f $group
        python $imageCli edit --model gpt-image-2.5-flare --image "assets/effects/generated-details/$style-detail.png" --image "$denseRoot/controls/$style-$part.png" --image "assets/effects/generated-keyframe-experiments/image-2.5/$style-flare-grid.png" --prompt-file "$denseRoot/prompts/$style-$part.txt" --size 1536x1024 --quality high --out "$denseRoot/raw/$style-$part.png" --force --no-augment
    }
}

python scripts/export-flare-dense.py
foreach ($style in @('styleCyberpunk', 'styleMatrix')) {
    ffmpeg -hide_banner -loglevel error -y -stream_loop 3 -framerate 15 -i "$denseRoot/frames/$style-%03d.png" -c:v libx264 -crf 18 -pix_fmt yuv420p "$denseRoot/$style-dense15.mp4"
    ffmpeg -hide_banner -loglevel error -y -stream_loop 3 -framerate 15 -i "tmp/flare-dense-export/$style-compare-%03d.png" -c:v libx264 -crf 18 -pix_fmt yuv420p "$denseRoot/$style-density-comparison.mp4"
}
```

重新生成有随机性；源码 RGB 快照及输出哈希用于核查这次实际输入输出，不保证重新运行生成同一张图片。正式详情图和实验室运行时没有因这组备选而替换。
