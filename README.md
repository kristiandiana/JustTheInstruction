<p align="center">
  <a href="https://chromewebstore.google.com/detail/just-the-instructions/lfoilkbebjommkenfehehofgoiopmenn" title="Install from Chrome Web Store">
    <img src="./extension/images/marquee.jpg" alt="JustTheInstructions Marquee"/>
  </a>
</p>

<p align="center">
  <a href="https://chromewebstore.google.com/detail/just-the-instructions/lfoilkbebjommkenfehehofgoiopmenn">
    <img src="https://img.shields.io/badge/⬇️ Install from Chrome Web Store-0A66C2?style=for-the-badge&logo=googlechrome&logoColor=white" />
  </a>
</p>

---

## 💡 Project Overview

Scrolling past paragraphs of filler text just to find recipe steps or DIY instructions? **JustTheInstructions** solves that by detecting instructional content in real time **as soon as a page loads** — and delivering clean, formatted instructions in **just one click**.

<p align="center">
  <img src="./extension/images/demo.gif" alt="JustTheInstructions Demo Gif"/> 
</p>

### **What makes it different?**

- **Automatic Detection:** Pages are analyzed locally in **under 500ms** using a custom ONNX model.
- **Smart Notifications:** A **Chrome notification** instantly appears when instructional content is detected — no need to open the extension.
- **One-Click Extraction:** Click once, and the instructions are automatically extracted, cleaned, and formatted for you — **ready in seconds instead of endless scrolling**.
- **Optional Manual Mode:** Notifications can be toggled off — you can still run the extension manually in just **2 clicks** (open extension → click “Extract Instructions”).

---

## 📈 Performance & Impact

- **Real-Time Detection:** Page content scored for instructional relevance in **300–500ms** after load
- **One-Click Flow:** Notification → click → clean instructions
- **Model Accuracy:** 99.6% on a 100k-sentence test set (80/10/10 split)
- **Inference Speed:** ~11ms/sentence (~80+ sentences/sec)
- **Extraction Speed:** Formatted instructions returned in **~2–10 seconds**
- **Model Size:** **2.5MB ONNX** — small enough for fast extension loading & smooth performance on low-end laptops
- **Data Scale:** ~1M labeled sentences scraped from **5,000 instructional websites**
- **Privacy:** Detection is **100% client-side**; formatting only runs **when you explicitly request it**

---

## 🧭 Objectives

1. **Score instructional relevance with >99% accuracy** while running entirely client-side.
2. **Deliver clean, formatted instructions in under 10 seconds** end-to-end.
3. **Eliminate manual interaction** — automated detection + one-click flow, with manual fallback.
4. Maintain **privacy-first design** by limiting server calls to formatting only.

---

## 🧠 How It Works

1. **Real-Time Detection (Client-Side)**

   - As soon as a page loads, text is segmented into **sentences**.
   - A **TensorFlow-trained binary classifier (exported to ONNX)** assigns each page a confidence score (low/medium/high instructional content).
   - Detection runs **fully in-browser** via ONNX Runtime (WebAssembly).

2. **Why ONNX Runtime?**

   - **2.5MB model size** — ~40% smaller than a comparable TensorFlow.js build, reducing download & memory usage
   - **Faster inference** due to WebAssembly optimizations
   - **Better for weak devices:** Lightweight enough for low-end laptops and Chromebooks

3. **Notification-Driven UX**

   - If the score passes a threshold, you receive a **Chrome notification** — no need to open the extension.
   - Clicking the notification triggers automatic extraction.
   - **Notifications Off?** You can still run the model manually in **2 clicks** (open → extract).

4. **Backend-Powered Formatting**

   - Candidate sentences are sent to a lightweight **Flask API**, which:
     - Cleans & structures the text into **Markdown-formatted steps**
     - Adds prerequisites (ingredients, tools, etc.) when relevant
   - The API is **Dockerized and deployed on GCP Cloud Run** for scalable, low-latency performance.

5. **Privacy & Safety**
   - Detection always runs locally — **only when you explicitly click “Extract Instructions” is page data sent for formatting.**
   - Sensitive domains (e.g., Gmail, banking) are automatically skipped.

---

## 📊 Data Collection & Training

- Scraped **5,000 instructional websites** across five categories:  
  🍲 Recipes • 🎨 Crafts • 🔌 Circuits • 🧪 DIY Science • 🛠️ General Tutorials
- Collected ~**1M labeled sentences** via a custom **BeautifulSoup + Pandas pipeline**.
- Dataset split into **80% training / 10% test / 10% validation**.
- Achieved **99.6% test accuracy (100k sentences)**.
- Model exported to **ONNX Runtime** for optimized frontend inference.

**Model Architecture:**  
Binary text classifier — Embedding → GlobalAveragePooling → Dense(16, ReLU) → Dropout(0.4) → Dense(16, ReLU) → Dropout(0.4) → Sigmoid (~64K parameters, Adam optimizer)

📄 **Colab Notebooks (for reproducibility):**

- [Model Architecture & Training](https://colab.research.google.com/drive/1nkqleu9FP2pN5D40q1NK_xuyOvsKG7vy?usp=sharing)
- [Data Collection & Scraping Pipeline](https://colab.research.google.com/drive/1k1D4zRW0nFicjkS-KqtCVW3y4mn8qSJR?usp=sharing)

---

## 🛠️ Tech Stack

| Layer               | Tech                                                   |
| ------------------- | ------------------------------------------------------ |
| **Model**           | ONNX Runtime (browser), TensorFlow (training)          |
| **Reasoning**       | ONNX chosen for smaller bundle size & faster inference |
| **Data Processing** | Pandas, NumPy, BeautifulSoup                           |
| **Frontend**        | JavaScript (Chrome Extension with DOM injection)       |
| **Backend API**     | Flask, Docker, Google Cloud Run                        |
| **Formatting**      | GPT-4.1-nano (Markdown restructuring & cleaning)       |

<p>
  <a href="https://www.tensorflow.org/"><img src="https://img.shields.io/badge/TensorFlow-FF6F00?style=for-the-badge&logo=tensorflow&logoColor=white" /></a>
  <a href="https://onnx.ai/"><img src="https://img.shields.io/badge/ONNX-005CED?style=for-the-badge&logo=onnx&logoColor=white" /></a>
  <a href="https://www.javascript.com/"><img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" /></a>
  <a href="https://www.google.com/intl/en_ca/colab/"><img src="https://img.shields.io/badge/Colab-F9AB00?style=for-the-badge&logo=googlecolab&logoColor=white" /></a>
  <a href="https://www.docker.com/"><img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" /></a>
  <a href="https://cloud.google.com/"><img src="https://img.shields.io/badge/GCP-4285F4?style=for-the-badge&logo=googlecloud&logoColor=white" /></a>
  <a href="https://pandas.pydata.org/"><img src="https://img.shields.io/badge/Pandas-150458?style=for-the-badge&logo=pandas&logoColor=white" /></a>
  <a href="https://www.crummy.com/software/BeautifulSoup/"><img src="https://img.shields.io/badge/BeautifulSoup-FFC107?style=for-the-badge" /></a>
</p>

---

<p align="center">
  ⭐️ <strong>Found this useful?</strong> — <a href="https://github.com/kristiandiana/justtheinstructions">Star this repo</a>  
  <br />
  📝 <strong>Help others discover it</strong> — <a href="https://chromewebstore.google.com/detail/just-the-instructions/lfoilkbebjommkenfehehofgoiopmenn">Leave a review on the Chrome Web Store</a>
  <br/>
  <br/>
    <a href="https://chromewebstore.google.com/detail/just-the-instructions/lfoilkbebjommkenfehehofgoiopmenn">
    <img src="https://img.shields.io/badge/⬇️ Install from Chrome Web Store-0A66C2?style=for-the-badge&logo=googlechrome&logoColor=white" />
  </a>
</p>
