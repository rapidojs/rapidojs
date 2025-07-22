#!/bin/bash

echo "🧪 Running Rapido.js Framework Tests"
echo "===================================="

# 构建所有包
echo "📦 Building all packages..."
pnpm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build successful!"
echo ""

# 运行核心包测试
echo "🔧 Running @rapidojs/core tests..."
pnpm --filter @rapidojs/core test

if [ $? -ne 0 ]; then
    echo "❌ Core tests failed!"
    exit 1
fi

echo "✅ Core tests passed!"
echo ""

# 启动示例应用进行集成测试
echo "🚀 Starting example-api for integration tests..."
cd apps/example-api
node dist/main.js &
SERVER_PID=$!

# 等待服务器启动
sleep 2

echo "🧪 Running integration tests..."

# 测试基本路由
echo "Testing GET /app/hello..."
RESPONSE=$(curl -s http://localhost:3000/app/hello)
if [ "$RESPONSE" = "Hello World!" ]; then
    echo "✅ Basic route test passed"
else
    echo "❌ Basic route test failed: $RESPONSE"
    kill $SERVER_PID
    exit 1
fi

# 测试查询参数
echo "Testing GET /app/greet?name=TestUser..."
RESPONSE=$(curl -s "http://localhost:3000/app/greet?name=TestUser")
if [ "$RESPONSE" = "Hello, TestUser!" ]; then
    echo "✅ Query parameter test passed"
else
    echo "❌ Query parameter test failed: $RESPONSE"
    kill $SERVER_PID
    exit 1
fi

# 测试路径参数
echo "Testing GET /app/users/123..."
RESPONSE=$(curl -s http://localhost:3000/app/users/123)
if [[ "$RESPONSE" == *"123"* ]]; then
    echo "✅ Path parameter test passed"
else
    echo "❌ Path parameter test failed: $RESPONSE"
    kill $SERVER_PID
    exit 1
fi

# 测试POST请求
echo "Testing POST /app/users..."
RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" -d '{"name":"John","email":"john@example.com"}' http://localhost:3000/app/users)
if [[ "$RESPONSE" == *"User created"* ]]; then
    echo "✅ POST request test passed"
else
    echo "❌ POST request test failed: $RESPONSE"
    kill $SERVER_PID
    exit 1
fi

# 停止服务器
kill $SERVER_PID

echo ""
echo "🎉 All tests passed successfully!"
echo "✨ Rapido.js framework is working correctly!"
