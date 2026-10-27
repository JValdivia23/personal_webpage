---
title: "Radar Data Processing with DCT"
summary: "Advanced noise removal in radar data using Discrete Cosine Transform (DCT) smoothing."
priority: 1
tags: ["Signal Processing", "Radar", "Algorithms", "Python"]
links:
  repo: "https://github.com/JValdivia23/radar-dct-smoothing"
  paper: "https://doi.org/10.5194/amt-19-5211-2026"
---

This study introduces a computationally efficient and methodologically robust approach for smoothing radar data using the Discrete Cosine Transform (DCT). Traditional spatial convolution methods for noise reduction in polar coordinates suffer from geometric inconsistencies and prohibitive computational costs, particularly when implementing range-dependent dynamic kernels to maintain physical scale. 

We propose a spectral-domain alternative that utilizes the convolution theorem to perform equivalent smoothing operations. By deriving analytical transfer functions for various kernels—including Boxcar,Gaussian, and Savitzky-Golay—we demonstrate that the DCT method achieves identical performance to spatial convolution while effectively handling boundary conditions. Performance benchmarks on real C-band weather radar data reveal that the DCT-based approach offers speedup factors exceeding 800× for large kernel sizes. Furthermore, for large-scale datasets (180 million pixels), equivalent processing time is reduced from over 1 hour to under 18 seconds. The proposed method ensures physically consistent smoothing across ranges, preserving small-scale meteorological features while enabling real-time data10
quality improvement.

- **Open Source:** The tool is available as an open-source Python code for the radar community.
