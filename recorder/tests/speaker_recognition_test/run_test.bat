@echo off
echo 🎯 ASR说话人识别功能测试启动脚本
echo ===============================================

REM 检查是否提供了音频文件参数
if "%~1"=="" (
    echo ❌ 错误：未提供音频文件路径
    echo 用法: run_test.bat [音频文件路径]
    echo 示例: run_test.bat ..\..\1753784804508-12235786.webm
    exit /b 1
)

REM 检查文件是否存在（在uploads目录中）
set "UPLOADS_PATH=..\..\uploads\%1"
if not exist "%UPLOADS_PATH%" (
    echo ❌ 错误：文件不存在 - %UPLOADS_PATH%
    exit /b 1
)

echo 📁 使用音频文件: %1
echo.

REM 切换到项目根目录
cd ..\..\

REM 运行测试脚本
echo 🚀 开始运行测试...
echo.

node tests/speaker_recognition_test/test_asr_with_speaker_info.js %1

echo.
echo 测试完成！