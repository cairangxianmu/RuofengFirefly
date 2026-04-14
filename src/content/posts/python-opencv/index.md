---
title: Python + OpenCV 图像处理实战
published: 2026-04-14
description: 基于 Python 与 OpenCV 实现手写藏文字母图像的自动提取与裁剪，涵盖 HSV 颜色提取、中值滤波、霍夫直线检测、轮廓检测、图像旋转与裁剪等核心处理流程。
image: /assets/images/covers/python-opencv.svg
tags: [Python, OpenCV, 图像处理, 计算机视觉]
category: 项目
draft: false
---

## 一、依赖安装

```bash
pip install numpy opencv-python pillow
```

## 二、项目说明

本项目源于手写藏文字母识别任务，需要对扫描的手写表格图像进行预处理，自动提取表格中每个格子内的字母并保存。项目由两个文件构成：

- `main.py`：读取文件夹下的图像，完成提取、裁剪并保存
- `replace.py`：消除图像中多余的红色框线

项目地址：[Handwritten Tibetan Letters](https://gitee.com/handwritten_tibetan_letters/Handwritten_Tibetan_letters/tree/master/image_processing)

## 三、图像处理流程

原始图像如下，为带有红色格线的手写表格：

<div align="center">
  <img src="./images/01-original.jpeg" width="250" height="300" alt="原始图像" />
</div>

---

### 1. HSV 颜色提取

`separate_color_red` 函数提取图像中的红色框线。将图像从 BGR 转换为 HSV 色彩空间后，通过 `cv2.inRange` 指定颜色范围进行掩膜提取。

> **HSV 颜色范围参考**：[点击查看各颜色 HSV 分量范围](https://blog.csdn.net/u013270326/article/details/80704754)

**函数说明：`cv2.inRange(hsv, lowerb, upperb)`**

| 参数 | 说明 |
|------|------|
| `hsv` | 输入图像，需先转换为 HSV 格式 |
| `lowerb` | H、S、V 分量的最低值 |
| `upperb` | H、S、V 分量的最高值 |

```python
hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)  # 转换为 HSV 色彩空间
lower_hsv = np.array([0, 43, 46])            # 红色 HSV 下界
high_hsv  = np.array([10, 255, 255])         # 红色 HSV 上界
mask = cv2.inRange(hsv, lowerb=lower_hsv, upperb=high_hsv)
```

提取效果：

<div align="center">
  <img src="./images/02-hsv.png" width="250" height="300" alt="HSV 颜色提取结果" />
</div>

---

### 2. 中值滤波

`medianBlur` 用于过滤掉除最外层框线以外的噪声线条，保留主体轮廓。

**函数说明：`cv2.medianBlur(img, ksize)`**

| 参数 | 说明 |
|------|------|
| `img` | 输入图像 |
| `ksize` | 滤波核大小，必须为大于 1 的奇数（如 3、5、7、19） |

```python
mediu = cv2.medianBlur(img, 19)
```

滤波效果：

<div align="center">
  <img src="./images/03-median.png" width="250" height="300" alt="中值滤波结果" />
</div>

---

### 3. 概率霍夫直线检测

调用 `HoughLinesP` 前需先执行 Canny 边缘检测，将图像二值化。

**`cv2.Canny(img, threshold1, threshold2)`**

| 参数 | 说明 |
|------|------|
| `threshold1` | 低阈值，用于连接间断边缘 |
| `threshold2` | 高阈值，用于检测明显边缘 |

**`cv2.HoughLinesP(img, rho, theta, threshold, lines, minLineLength, maxLineGap)`**

| 参数 | 说明 |
|------|------|
| `img` | 输入图像，须为 Canny 边缘检测后的二值图 |
| `rho` | 直线半径精度，建议设为 1 |
| `theta` | 角度步长，通常为 `np.pi / 180` |
| `threshold` | 累加器阈值 |
| `minLineLength` | 最短直线长度，短于此值的直线被忽略 |
| `maxLineGap` | 同一直线上点的最大间隔，超过则视为两条线 |

```python
img_canny = cv2.Canny(img, 20, 250)
lines = cv2.HoughLinesP(
    img_canny, 1, np.pi / 180, 120,
    lines=4, minLineLength=50, maxLineGap=150
)
lines1 = lines[:, 0, :]  # 降维处理
for x1, y1, x2, y2 in lines1:
    cv2.line(img, (x1, y1), (x2, y2), (255, 255, 255), 2)
```

---

### 4. 轮廓检测

`findContours` 用于检测最外层矩形框，并获取其偏转角度，供后续旋转矫正使用。

**`cv2.findContours(img, mode, method)`**

| 参数 | 可选值 | 说明 |
|------|--------|------|
| `mode` | `cv2.RETR_EXTERNAL` | 只检测最外层轮廓 |
| | `cv2.RETR_LIST` | 检测所有轮廓，不建立层级关系 |
| | `cv2.RETR_CCOMP` | 建立两层轮廓（外边界 + 内孔） |
| | `cv2.RETR_TREE` | 建立完整层级树 |
| `method` | `cv2.CHAIN_APPROX_NONE` | 存储所有轮廓点 |
| | `cv2.CHAIN_APPROX_SIMPLE` | 只保留方向端点，压缩冗余点 |

```python
image, contours, hier = cv2.findContours(
    img, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
)
for c in contours:
    rect  = cv2.minAreaRect(c)   # 最小外接矩形
    box_  = cv2.boxPoints(rect)
    h = abs(box_[3, 1] - box_[1, 1])
    w = abs(box_[3, 0] - box_[1, 0])

    # 过滤掉不符合尺寸的轮廓
    if h > 3000 or w > 2200:
        continue
    if h < 2500 or w < 1500:
        continue

    box   = np.int0(cv2.boxPoints(rect))
    angle = rect[2]

    # 角度归一化到 [0, 45] 范围
    if abs(angle) > 45:
        angle = 90 - abs(angle)
```

---

### 5. 旋转矫正

将倾斜的图像旋转至水平方向。

**`cv2.getRotationMatrix2D(center, angle, scale)`**

| 参数 | 说明 |
|------|------|
| `center` | 旋转基点（通常为图像中心） |
| `angle` | 旋转角度 |
| `scale` | 缩放因子，1 表示不缩放 |

**`cv2.warpAffine(img, M, dsize)`**

| 参数 | 说明 |
|------|------|
| `M` | 由 `getRotationMatrix2D` 得到的变换矩阵 |
| `dsize` | 输出图像尺寸 `(width, height)` |

```python
(h, w) = img.shape[:2]
center = (w // 2, h // 2)
M = cv2.getRotationMatrix2D(center, angle, 1)
rotated = cv2.warpAffine(img, M, (w, h))
```

矫正效果：

<div align="center">
  <img src="./images/04-rotate.png" width="250" height="300" alt="旋转矫正结果" />
</div>

---

### 6. 图像裁剪

**沿外层矩形框裁剪：**

<div align="center">
  <img src="./images/05-cut1.png" width="250" height="300" alt="沿边框裁剪" />
</div>

```python
# 利用轮廓坐标裁剪
x1, y1 = box[1]
x2, y2 = box[3]
img_cut = img[y1 + 10:y2 - 10, x1 + 10:x2 - 10]
```

**按格子裁剪并批量保存：**

```python
# 数组切片裁剪（需用 cv2.imread 加载图像）
img[y1:y2, x1:x2]
```

裁剪效果：

<div align="center">
  <img src="./images/06-cut2.png" width="250" height="300" alt="按格子裁剪结果" />
</div>

---

### 7. 消除多余红色框线

使用 PIL 逐像素替换，将红色像素替换为白色。

> **注意**：此操作须使用 `Image.open()` 加载图像，而非 `cv2.imread()`。

```python
from PIL import Image

img2 = Image.open(path)
img2 = img2.convert('RGBA')
pixdata = img2.load()

for y in range(img2.size[1]):
    for x in range(img2.size[0]):
        if pixdata[x, y][0] > 220:  # 判断为红色像素
            pixdata[x, y] = (255, 255, 255, 255)  # 替换为白色

img2 = img2.convert('RGB')
img2.save(path)
```

处理效果：

<div align="center">
  <img src="./images/07-replace.png" width="250" height="300" alt="消除多余框线结果" />
</div>

---

## 四、完整代码

### main.py

```python
import cv2
import numpy as np
import os
import replace


def separate_color_red(img):
    """提取图像中的红色区域（HSV 颜色提取）"""
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    lower_hsv = np.array([0, 43, 46])
    high_hsv  = np.array([10, 255, 255])
    mask = cv2.inRange(hsv, lowerb=lower_hsv, upperb=high_hsv)
    print("颜色提取完成")
    return mask


def salt(img, n):
    """椒盐去噪"""
    for _ in range(n):
        i = int(np.random.random() * img.shape[1])
        j = int(np.random.random() * img.shape[0])
        if img.ndim == 2:
            img[j, i] = 255
        elif img.ndim == 3:
            img[j, i] = [255, 255, 255]
    print("去噪完成")
    return img


def show(name, img):
    """显示图像"""
    cv2.namedWindow(str(name), cv2.WINDOW_NORMAL)
    cv2.resizeWindow(str(name), 800, 2000)
    cv2.imshow(str(name), img)


def lines(img):
    """概率霍夫直线检测，补全矩形框线"""
    img_canny = cv2.Canny(img, 20, 250)
    detected = cv2.HoughLinesP(
        img_canny, 1, np.pi / 180, 120,
        lines=4, minLineLength=50, maxLineGap=150
    )
    for x1, y1, x2, y2 in detected[:, 0, :]:
        cv2.line(img, (x1, y1), (x2, y2), (255, 255, 255), 2)
    return img


def contour(img):
    """轮廓检测，返回最外层矩形框坐标及偏转角度"""
    image, contours, hier = cv2.findContours(
        img, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
    )
    box, angle = None, 0
    for c in contours:
        rect = cv2.minAreaRect(c)
        box_ = cv2.boxPoints(rect)
        h = abs(box_[3, 1] - box_[1, 1])
        w = abs(box_[3, 0] - box_[1, 0])
        print(f"宽={w:.1f}, 高={h:.1f}")
        if h > 3000 or w > 2200:
            continue
        if h < 2500 or w < 1500:
            continue
        box   = np.int0(cv2.boxPoints(rect))
        angle = rect[2]
        if abs(angle) > 45:
            angle = 90 - abs(angle)
    print(f"轮廓数量: {len(contours)}")
    return img, box, angle


def rotate(img, angle):
    """旋转图像至水平方向"""
    (h, w) = img.shape[:2]
    center = (w // 2, h // 2)
    M = cv2.getRotationMatrix2D(center, angle, 1)
    return cv2.warpAffine(img, M, (w, h))


def cut1(img, box):
    """沿外层矩形框裁剪图像"""
    x1, y1 = box[1]
    x2, y2 = box[3]
    return img[y1 + 10:y2 - 10, x1 + 10:x2 - 10]


def cut2(img, out_path, filed):
    """按格子裁剪图像并批量保存"""
    if not os.path.isdir(out_path):
        os.makedirs(out_path)
    h, w, _ = img.shape
    print(f"图像尺寸: {w}x{h}")
    s, i_ = 0, 0
    for i in range(h // 12, h, h // 12):
        j_ = 0
        for j in range(w // 8, w, w // 8):
            imgd = img[i_ + 5:i - 5, j_ + 5:j - 5]
            out_pathd = os.path.join(out_path, f"{filed[:-4]}_{s}.jpg")
            cv2.imwrite(out_pathd, imgd)
            print(f"保存: {out_pathd}")
            s += 1
            j_ = j
        i_ = i


if __name__ == "__main__":
    path     = "/home/crxm/C1/"   # 输入图像文件夹
    put_path = "/home/crxm/C2/"   # 输出图像文件夹

    for folder in os.listdir(path):
        pathd    = os.path.join(path, folder) + "/"
        out_path = os.path.join(put_path, folder) + "/"

        for filed in os.listdir(pathd):
            img_path = os.path.join(pathd, filed)
            img = cv2.imread(img_path)

            img_separate  = separate_color_red(img)             # 提取红色框线
            mediu         = cv2.medianBlur(img_separate, 19)    # 中值滤波
            img_lines     = lines(mediu)                         # 直线检测，补全框线
            _, box, angle = contour(img_lines)                   # 轮廓检测，获取偏转角度
            print(f"角度={angle}, 坐标={box}")

            img_rotate        = rotate(img_lines, angle)         # 旋转处理后图像
            _, box, _         = contour(img_rotate)              # 获取水平后的矩形坐标
            img_orig_rotate   = rotate(img, angle)               # 旋转原始图像
            img_orig_cut      = cut1(img_orig_rotate, box)       # 沿矩形框裁剪原图
            cut2(img_orig_cut, out_path, filed)                  # 按格子裁剪并保存
            replace.replace(put_path)                            # 消除多余红色框线

            cv2.waitKey(0)
            cv2.destroyAllWindows()
```

### replace.py

```python
from PIL import Image
import os


def replace(img_path):
    """将图像中的红色像素替换为白色"""
    for folder in os.listdir(img_path):
        folder_path = os.path.join(img_path, folder) + "/"
        for filename in os.listdir(folder_path):
            filepath = os.path.join(folder_path, filename)
            img = Image.open(filepath).convert('RGBA')
            pixdata = img.load()

            for y in range(img.size[1]):
                for x in range(img.size[0]):
                    if pixdata[x, y][0] > 220:  # 判断为红色像素
                        pixdata[x, y] = (255, 255, 255, 255)  # 替换为白色

            img.convert('RGB').save(filepath)
            print(f"已处理: {filename}")
```

## 五、处理流程总结

```
原始图像
  ↓ HSV 颜色提取（提取红色框线）
  ↓ 中值滤波（去除内部噪声线条）
  ↓ 霍夫直线检测（补全残缺框线）
  ↓ 轮廓检测（获取矩形框坐标与偏转角度）
  ↓ 旋转矫正（将图像对齐水平方向）
  ↓ 外框裁剪（沿矩形边界裁出表格区域）
  ↓ 格子裁剪（按行列切分保存各字母图像）
  ↓ 红线消除（替换残余红色像素为白色）
最终输出：各格子字母图像
```
