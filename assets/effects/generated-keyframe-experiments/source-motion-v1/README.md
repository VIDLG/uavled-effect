# 源码位置约束的生成关键帧

这组备选解决上一轮“帧数增加但同一色段来回震荡”的问题。生成关键帧继续保留：赛博朋克和黑客帝国分别通过 `gpt-image-2.5-flare` 新生成八张图，取源码第 0、16、32、48、64、80、96、112 帧。相邻关键帧的时间间隔约 0.533 秒，先让关键帧本身具有明确的位置差异，再连接颜色和明暗变化。

## 从源码到位置的映射

| 效果 | 位置规则 | 生成关键帧要求 | 过渡规则 |
| --- | --- | --- | --- |
| 赛博朋克 | `phase = (_frame * 4 + i * 42) % 512`；同一相位向更小索引移动 `4/42` 灯位/源码帧，左右镜像 | 每隔 16 帧，同一色段边界推进约 1.524 个灯位；背景斜轨上的亮部向左上推进，无人机和轨道结构固定 | 使用全部连续源码帧的 RGB，按固定物理灯位插值；背景生成细节沿已知方向前移 |
| 黑客帝国 | 独立灯位触发亮点，每个源码帧亮度减 15，熄灭后可重新触发 | 不同关键帧有不同的亮点位置及衰减状态；背景亮头下落、尾迹留在上方 | 灯带不人为追逐；背景亮头从对应灯位的触发时刻计算年龄，以 130 px/s 下落，光强遵循源码衰减 |

运动点是色段边界、亮点状态或背景光头。物理灯珠、无人机、背景轨道结构本身保持固定。模拟器取样为 30 FPS；每个视频含 224 张合成帧、按 60 FPS 播放，约 3.733 秒。60 FPS 中的中间帧为源码 RGB 和生成细节的插值，并非 60 张/秒独立生图。

关键区别是生图输入已经包含当前画面中标定好的位置，而不是让模型参照另一套模拟器构图猜运动。`calibration.json` 保存每侧 40 个物理投影点及对应逻辑索引。它是这组图片的人工视觉标定，不是实机灯位精度验证。

## 关键帧如何参与播放

每次参考图编辑生成一张四宫格，保留原始结果及逐张裁切。先对齐机身中性材质，再保留生成结果中相对于控制图的发光明暗细节。最终关键帧由源码约束颜色和位置，保留生成的细节增益（0.75–1.35 倍）；中性色材质使用固定参考像素。

中间时刻使用全部 113 张连续源码 RGB 快照，沿时间正向插值；背景细节在已知运动坐标中向前平移，再衔接下一张生成关键帧的细节。灯带载体不移动，只在各物理灯位上改变颜色、明暗。播放到末尾不倒放；GIF 回到开头仍有接缝，本组没有声称实现无缝循环。

直接由模型生成的原图依然可能偏离控制位置，因此 `generated/` 是原始候选，`keyframes/` 是实际用于动效的约束结果。原图的生成不代表已精确复现源码；逐灯颜色和位置核查针对约束后的画面。

## 文件位置

| 路径 | 内容 |
| --- | --- |
| `raw/` | 四张模型原始四宫格，1536×1024 |
| `generated/` | 原始模型结果裁出的八帧/效果，768×512 |
| `keyframes/` | 对齐并施加源码位置/颜色约束后的关键帧，编号为源码帧 |
| `*-keyframes.jpg` | 八张实际播放关键帧的总览，标有源码帧和时间 |
| `*-motion60.mp4` | 60 FPS 预览；没有重复播放凑时长 |
| `*-motion30.gif` | 30 FPS、576×384 的便捷预览，GIF 停留时间以 30/40 ms 近似 |
| `*-space-time.png` | 上半为沿左灯带采样的渲染颜色，下半为相同灯位/时间的源码 RGB；行是灯位，列是时间，可检查色段前进方向 |
| `request-controls/` | 实际发送给生图接口的四宫格输入像素；原始参考中的矩形保护区保留作请求证据 |
| `controls/` | 当前后处理使用的位置控制图和标定检查图；已去掉矩形背景冻结区，并锁定灯珠核心对应的准确索引 |
| `prompts/`、`manifest.json` | 完整提示词、模型参数、请求输入/输出哈希和运动映射 |
| `source-frames.json`、`calibration.json` | 连续源码 RGB、源码哈希、时间及灯位坐标 |
| `*-color-mask.png`、`verification.json` | 可变色区掩膜、对齐和逐灯颜色误差、中性色区域最大差异 |

保护中性材质按实际像素色彩和机身范围判断，不冻结整个矩形。沿灯带连续坐标采样时，灯珠核心锁定到对应整数索引，避免不亮的灯珠沾染相邻亮点。原图含有少量固定彩色反光；中性保护区的零变化仅适用于掩膜为零的区域，不表示整个机身的所有彩色反光都冻结。

## 复现与验证

需要 Node、Python（Pillow、NumPy、OpenCV）、FFmpeg 和已经配置好的 OpenAI Python 环境。所有命令在仓库根目录执行。

```powershell
npm run build
node scripts/prepare-source-motion.mjs
python -B scripts/source_motion.py prepare

$motionRoot = 'assets/effects/generated-keyframe-experiments/source-motion-v1'
$imageCli = Join-Path $env:USERPROFILE '.codex/skills/.system/imagegen/scripts/image_gen.py'
foreach ($style in @('styleCyberpunk', 'styleMatrix')) {
    foreach ($batch in 0..1) {
        $part = '{0:D2}' -f $batch
        python $imageCli edit --model gpt-image-2.5-flare --image "$motionRoot/request-controls/$style-$part.png" --image "assets/effects/generated-keyframe-experiments/flare-dense16/frames/$style-000.png" --prompt-file "$motionRoot/prompts/$style-$part.txt" --size 1536x1024 --quality high --out "$motionRoot/raw/$style-$part.png" --force --no-augment
    }
}

python -B scripts/source_motion.py export
python -B -m unittest discover -s tests -p test_source_motion.py
```

以上重跑生图使用已保存的原请求输入。继续制作新版本时，可改用 `controls/` 中当前控制图，并同步更新请求清单中的输入路径和哈希。模型输出具有随机性，不保证重现同一张图。

验证包括：正向时间轴在末尾不反转、同相位按源码方向移动、完全替换选中色区、中性区不变、八个关键时刻左右两侧逐灯颜色/熄灭状态与源码对应。导出时还逐帧检查固定区域，并输出灯带时空采样图。本组是独立动效备选，未替换正式详情图或实验室运行时。
