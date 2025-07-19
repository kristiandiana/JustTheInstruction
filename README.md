<p align="center">
  <img src="./extension/images/marquee.jpg" alt="JustTheInstruction Marquee"/>
</p>

<p align="center">
  <a href="https://chromewebstore.google.com/detail/just-the-instructions/lfoilkbebjommkenfehehofgoiopmenn">
    <img src="https://img.shields.io/badge/⬇️ Install from Chrome Web Store-0A66C2?style=for-the-badge&logo=googlechrome&logoColor=white" />
  </a>
</p>

---

## 💡 Project Description

Isn't it the worst when you find a recipe online, but need to scroll down for what feels like hours to find the actual instructions? We too have been bothered by this issue and began to think of a solution. What if we could use AI to extract **_JustTheInstructions_** from any recipe, arts & crafts, or other DIY website?

Well, we built a custom AI model to do just that — and the power of this tool is one click away thanks to our Chrome Extension.

### 🧭 Project Objectives

1. Build a lightweight binary text classification model using TensorFlow.
2. Scrape and prepare high-quality data across a wide range of instruction-heavy content types.
3. Optimize real-time, on-device inference by exporting to ONNX Runtime — achieving sub-second classification fully in-browser, without API calls.
4. Use GPT-4.1-nano via a lightweight backend to cleanly format the extracted instructions for the end user.

---

## 🧠 How It Works

Once installed, the extension analyzes pages **in real time — directly in your browser**. Here's the flow:

- The entire page is scanned using our custom-trained TensorFlow model **exported to ONNX Runtime for in-browser inference**.
- If instructional content is detected **above a confidence threshold**, you'll get a notification.
- In **one click**, the detected content is sent to our backend, where **GPT-4.1-nano** restructures it into clean Markdown — outlining clear step-by-step instructions **and, when applicable, prerequisites such as ingredients, tools, or materials.**

> ⚡ **Runs fully on the frontend:** ONNX Runtime enables **real-time, on-device inference** — no API calls, no backend load, and no cost to you.  
> 🔒 **Privacy-first by design:** Your page data is never saved, logged, or sent anywhere unless you explicitly click "Extract Instructions."  
> 🚫 **Sensitive sites ignored:** The classifier automatically avoids pages likely to contain private information (e.g., Gmail, Outlook, banking portals).  
> 🏎️ **Why ONNX Runtime?** Compared to TensorFlow.js, ONNX gave us **smaller bundle size, faster inference, and better WebAssembly performance**, making it ideal for low-end laptops and preserving user privacy.  
> 💬 The formatting step (GPT-4.1-nano) is handled by a lightweight Flask backend hosted via **Docker + GCP**.  
> 🛑 Notifications too much? Toggle them off in settings and run extraction manually — it’s still just 2–3 clicks.

📣 **No instructions detected?**  
No worries — you can always click the extension and run “Extract Instructions” manually. A clean response arrives **in seconds**.

> 🛑 No more reading about how a 50-year-old divorcee from Ohio found her life purpose in sourdough.  
> ✅ Just. The. Instructions.

---

## 📊 Data Collection & Training

We collected over **1000 high-quality entries** from each of these instructional categories:

- 🍲 Recipes
- 🎨 Crafts
- 🔌 Circuits
- 🧪 DIY Science
- 🛠️ General Tutorials

All data was collected via **custom web scraping** using BeautifulSoup and processed using Pandas — no third-party datasets were used. The model was then trained using TensorFlow and deployed in ONNX/TensorFlow.js format for frontend usage.

📄 **Colab Notebooks (if you're interested in diving deeper):**

- [Model Architecture & Training](https://colab.research.google.com/drive/1nkqleu9FP2pN5D40q1NK_xuyOvsKG7vy?usp=sharing)
- [Data Collection & Scraping Pipeline](https://colab.research.google.com/drive/1k1D4zRW0nFicjkS-KqtCVW3y4mn8qSJR?usp=sharing)

---

## 🛠️ Tech Stack

| Layer                | Tech                                                        |
| -------------------- | ----------------------------------------------------------- |
| **Model**            | ONNX Runtime (browser), TensorFlow (training)               |
| **Reasoning**        | ONNX chosen for lightweight, real-time in-browser inference |
| **Data Processing**  | Pandas, NumPy, BeautifulSoup                                |
| **Frontend**         | JavaScript (Chrome Extension with DOM injection)            |
| **Smart Formatting** | GPT-4.1-nano via Flask backend                              |
| **Deployment**       | Docker + Google Cloud Platform (Cloud Run)                  |

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
  ⭐️ <strong>Found this useful?</strong> — <a href="https://github.com/kristiandiana/justtheinstruction">Star this repo</a>  
  <br />
  📝 <strong>Help others discover it</strong> — <a href="https://chromewebstore.google.com/detail/just-the-instructions/lfoilkbebjommkenfehehofgoiopmenn">Leave a review on the Chrome Web Store</a>
  <br/>
  <br/>
    <a href="https://chromewebstore.google.com/detail/just-the-instructions/lfoilkbebjommkenfehehofgoiopmenn">
    <img src="https://img.shields.io/badge/⬇️ Install from Chrome Web Store-0A66C2?style=for-the-badge&logo=googlechrome&logoColor=white" />
  </a>
</p>
