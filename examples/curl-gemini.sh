curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "gemini",
    "model": "gemini-2.5-flash",
    "message": "Create customer c_100 named Loai Abdalslam with email loaiabdalslam@gmail.com"
  }'
