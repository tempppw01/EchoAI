#!/bin/bash

# 检查是否提供了版本号
if [ -z "$1" ]; then
    echo "请提供版本号，例如: ./deploy.sh v1.0.0"
    exit 1
fi

VERSION=$1
IMAGE_NAME="34v0wphix/shapi"

echo "🚀 开始构建版本 $VERSION (同时更新 dav 标签) ..."

# 构建镜像
docker build -t $IMAGE_NAME:$VERSION .
docker build -t $IMAGE_NAME:dav .

echo "✅ 构建完成！"
echo "📦 准备推送..."

# 检查是否已登录（简单检查）
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker 未运行，请先启动 Docker"
    exit 1
fi

# 推送镜像
echo "⬆️ 推送 $IMAGE_NAME:$VERSION ..."
docker push $IMAGE_NAME:$VERSION

echo "⬆️ 推送 $IMAGE_NAME:dav ..."
docker push $IMAGE_NAME:dav

echo "🎉 部署完成！"
echo "镜像地址: $IMAGE_NAME:$VERSION"
