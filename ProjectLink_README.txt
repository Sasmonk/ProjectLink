# 📚 ProjectLink – The LinkedIn for Student Projects

**ProjectLink** is a modern web app that allows students to **upload**, **showcase**, and **collaborate** on engineering and academic projects. It acts like **LinkedIn for projects**, helping students find peers with similar interests and work together across institutions and domains.

---

## 🔥 Key Features

- 🔐 Secure Authentication (Sign up / Login with JWT)  
- 🧑‍🎓 Verified Student Profiles  
- 📤 Upload Projects with Descriptions, Tags, and Links  
- 🏷️ Tag-based Search and Filtering (e.g., #AI, #IoT, #Blockchain)  
- 💬 Interact via Comments and Likes  
- 🔍 Search by Field, Institution, or Keyword  
- 🧾 Attach GitHub Repos, Videos, or Project Docs  
- 📊 Personal Dashboard to Track Project Engagement  
- 🏫 Institution-based Filtering  
- 🤝 Follow/Connect Feature  
- 🔔 Notifications for Interactions  

---

## 🧱 Tech Stack

### Frontend
- React.js (using Cursor AI)
- Tailwind CSS for clean, responsive UI
- ShadCN UI components
- Framer Motion for smooth animations

### Backend
- Node.js + Express.js
- MongoDB with Mongoose
- JWT for Authentication
- Zod for input validation
- Dockerized for deployment and local testing

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/projectlink.git
cd projectlink
```

### 2. Create `.env` File

```env
PORT=5000  
MONGO_URI=your_mongodb_connection_string  
JWT_SECRET=your_secure_jwt_secret  
```

### 3. Run with Docker

```bash
docker-compose up --build
```

App runs at: [http://localhost:3000](http://localhost:3000)

---

## 📁 Folder Structure

```
/client     → Frontend (Cursor-based UI)
/server     → Backend API (Express.js)
/shared     → Common types/utilities
/docker     → Docker configurations
.env        → Environment configuration
```

---

## 🛠️ MVP Checklist

- [x] User Signup & Login  
- [x] Upload Project with Tags  
- [x] View & Interact with Other Projects  
- [x] Profile Page with Basic Info  
- [x] Institution-based Filtering  
- [x] Follow/Connect Feature  
- [x] Notifications for Interactions  

---

## 👨‍💻 Contributing

Pull requests are welcome!  
Please open an issue first to discuss what you’d like to change.  
Follow conventional commits and maintain code readability.

---

## 📄 License

MIT License

---

## 🌟 Why ProjectLink?

Students often build amazing projects but lack the platform to showcase and connect with others working on similar ideas. ProjectLink solves this by giving them a space to upload, discover, and collaborate on projects with peers — just like LinkedIn, but focused solely on innovation.

---

## 🧠 Built with ❤️ using Cursor AI
