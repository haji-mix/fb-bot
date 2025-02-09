
# (FB-AUTOBOT)

Kokoro-Project is a **forked and modified version** of the original **FB-AUTOBOT**, designed to enhance the **automation of Facebook Messenger bots**. With an improved feature set, better performance, and extended customization options, Kokoro makes chatbot deployment easier and more efficient.

---

## 🚀 Key Features

✅ **Enhanced AI Capabilities** – Leverages multiple AI models for smarter automation.  
✅ **Seamless Facebook Messenger Integration** – Automate messages, replies, and posts.  
✅ **User-Friendly Interface** – Easily configure and deploy bots.  
✅ **Customizable Actions** – Define specific bot behaviors.  
✅ **Plugin Support** – Expand functionalities with modular plugins.  
✅ **Improved Performance** – Optimized for stability and speed.  

---

![Chatbot Interaction Example](https://i.imgur.com/ciw2pfH.jpeg)

![Chatbot Interaction Example](https://i.imgur.com/nNXMoSd.jpeg)

![Chatbot Interaction Example](https://i.imgur.com/4fCYUJr.jpeg)

---

## 🛠 Getting Started

### 1️⃣ Clone the Repository  
Fork and clone this repository to your local machine:
```bash
git clone https://github.com/haji-mix/kokoro
```

```
cd kokoro
```

### 2️⃣ Install Dependencies  
Navigate to the project directory and install required packages:
```bash
npm install
```

### 3️⃣ Configure Environment Variables  
1. Create a `.env` file in the project root.  
2. Add the following optional variables:
   ```
   export APPSTATE='YOUR C3C COOKIE JSON'
   export PREFIX='YOUR BOT PREFIX e.g: #'
   export KEY='YOUR SERVER KEY it is used to restart the server'
   export PORT='Your Port e.g 25645'
   ```

### 4️⃣ Run the Application  
Start the bot using:
```bash
node index.js
```

### 5️⃣ Access the Web Interface  
Open your browser and go to localhost or your current host.domain:
```
http://localhost:${process.env.PORT}
```

### 6️⃣ Configure Login  
- Log in to your **dummy Facebook account** via the **Cookie** interface.  
- Copy the session cookie and paste it into the `appstate` container.  
- *(Optional)* Configure the chatbot prefix and admin ID.  

### 7️⃣ Explore Features  
Use the `"help"` command in Messenger to discover available chatbot commands and functionalities.

---

## 🤝 Contributing

We welcome contributions! If you’d like to improve **Kokoro-Project**, follow these steps:

1. **Fork this repository.**  
2. **Create a feature branch** (`feature/your-feature-name`).  
3. **Make your modifications** and commit your changes.  
4. **Push to your fork** and submit a **pull request (PR)** for review.

Make sure to check the [Contribution Guidelines](CONTRIBUTING.md) before submitting PRs.

---

## 📜 License

Kokoro-Project is licensed under the **MIT License**. For more details, see the [LICENSE](LICENSE) file.

---

## 🔗 Original Source

This project is based on the **FB-AUTOBOT**, an open-source AI chatbot automation tool. You can check out the [original FB-AUTOBOT repository](https://github.com/aizintel/AUTO) to explore its foundation and contributions.

---

## 📞 Contact & Support

Need help or have suggestions? Reach out to us:

📧 **Email**: [lkpanio25@gmail.com](mailto:lkpanio25@gmail.com)

💬 **Chatbot Community Discussions**: [Join!](https://facebook.com/groups/coders.dev/)

---

✨ **Happy Chatbot Building!** 🚀
