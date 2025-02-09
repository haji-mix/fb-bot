
---

# **FB-BOT (Kokoro-Project)**  

Kokoro-Project is a **forked and enhanced** version of the original **Facebook Autobot**, designed to **automate Facebook Messenger bots** efficiently. With a focus on **performance, customization, and ease of use**, Kokoro provides a seamless way to deploy and manage chatbots.  

---

## **🚀 Features**  

✅ **AI-Powered Automation** – Intelligent responses using multiple AI models.  
✅ **Facebook Messenger Integration** – Automate messages, replies, and posts.  
✅ **User-Friendly Configuration** – Simple `.env` and JSON-based setup.  
✅ **Customizable Actions** – Define bot behaviors with ease.  
✅ **Plugin Support** – Expand functionalities with modular plugins.  
✅ **Optimized Performance** – Lightweight, fast, and scalable.  

---

## **📸 Screenshots**  

![Chatbot Interaction](https://i.imgur.com/ciw2pfH.jpeg)  
![Bot Commands](https://i.imgur.com/nNXMoSd.jpeg)  
![Admin Panel](https://i.imgur.com/4fCYUJr.jpeg)  

---

## **🛠 Setup & Installation**  

### **1️⃣ Clone the Repository**  
```bash
git clone https://github.com/haji-mix/kokoro
cd kokoro
```

### **2️⃣ Install Dependencies**  
```bash
npm install
```

### **3️⃣ Configure Environment**  

#### **📌 .env Configuration**  
```bash
# Optional login methods
APPSTATE='YOUR C3C COOKIE JSON'  
EMAIL='YOUR FACEBOOK EMAIL'  
PASSWORD='YOUR FACEBOOK PASSWORD'  

# Bot settings  
PREFIX='YOUR BOT PREFIX e.g: #'  
sitekey='YOUR RECAPTCHA SITEKEY Skip this if you already configured the kokoro.json'
pass='YOUR SERVER PASSWORD'  
PORT='YOUR PORT e.g. 25645'  
```

---

## **🔑 CAPTCHA Configuration**  

To prevent abuse and ensure security, Kokoro requires **Google reCAPTCHA**. You **must replace** the existing site key with your own.

### **📌 Get Your reCAPTCHA Key**
1. Visit [Google reCAPTCHA](https://www.google.com/recaptcha/admin/create).  
2. **Register your website** and select **reCAPTCHA v2 ("I'm not a robot")**.  
3. Copy the **Site Key** and **Secret Key**.  

### **📌 Update `kokoro.json`**
Replace `"sitekey"` with your own:  
```json
{
  "author": "Kenneth Panio",
  "sitekey": "YOUR_GOOGLE_RECAPTCHA_SITE_KEY",
  "weblink": "https://yourwebsite.com or https:///127.0.0.1",
  "port": "Add if you hosted server on Direct-IP Website or Localhost e.g 8080",
  "timezone": "Asia/Manila"
}
```

🔗 **More Info**: [Google reCAPTCHA Documentation](https://developers.google.com/recaptcha/intro).  

---

### **4️⃣ Run the Bot**  
```bash
node index.js
```

### **5️⃣ Access the Web Interface**  
Visit:  
```
http://localhost:${process.env.PORT}
```

---

## **🛠 Bot Configuration: Admins & Blacklist**  

| Setting   | Description |
|-----------|------------|
| **Admins** | List of authorized users who can control the bot. They can manage commands, settings, and restart the bot. |
| **Blacklist** | Users who are **banned** from interacting with the bot. Messages from these users will be ignored. |

✅ **Example Admins**  
```json
"admins": ["61571269923364", "61564046133266"]
```

🚫 **Example Blacklist**  
```json
"blacklist": ["61566761027554"]
```

---

## **⏳ Scheduled Tasks (Cron Jobs)**  

Kokoro supports **automated scheduled tasks** using cron jobs. You can customize bot behaviors based on time-based schedules.  

| Task Name            | Enabled | Schedule |
|----------------------|---------|------------------------|
| **Restart Bot**      | ✅ Yes  | Every 24 hours (`0 */24 * * *`) |
| **Clear Chat**       | ❌ No   | Every day at midnight (`0 0 * * *`) |
| **Morning Greetings** | ❌ No   | 5 AM, 6 AM, 7 AM |
| **Motivational Messages** | ❌ No   | Every 5 hours (`0 */5 * * *`) |

📌 **Modify these schedules in `kokoro.json`.**  

---

## **🔑 Website Login Guide**  

1. **Download [Webvium](https://mrepol742.github.io/webviumdev/) and Install**.  
2. Open Webvium and log in to **Facebook** with a dummy account.  
3. Navigate to **DevTools > Cookie Manager**.  
4. Copy the Facebook **cookie JSON** and go to your site and paste it into `APPSTATE` container.  
5. *(Optional)* Configure bot prefix and admin settings.  
6. **Click Submit** and start using your chatbot!  

---

## **📖 Commands & Usage**  
Type `"help"` in Messenger to view available chatbot commands.  

---

## **🤝 Contributing**  

We welcome contributions! Follow these steps:  

1. **Fork the repository**  
2. **Create a new branch** (`feature/your-feature`)  
3. **Commit your changes**  
4. **Push to your fork & submit a PR**  

Read the [Contribution Guidelines](CONTRIBUTING.md) before submitting.  

---

## **📜 License**  

This project is licensed under the **MIT License**. See [LICENSE](LICENSE) for details.  

---

## **🔗 Original Source & Credits**  

This project is based on the open-source [Facebook Autobot](https://github.com/aizintel/AUTO).  

---

## **📞 Contact & Support**  

📧 **Email**: [lkpanio25@gmail.com](mailto:lkpanio25@gmail.com)  
💬 **Community**: [Join the discussion](https://facebook.com/groups/coders.dev/)  

✨ **Happy Chatbot Building! 🚀**  

---

