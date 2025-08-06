@echo off
echo Starting PackSafe development server...

cd packages/server
echo Creating .env file if it doesn't exist...
if not exist .env (
  copy .env.example .env
  echo Created .env file from .env.example
)

echo Installing dependencies...
npm install

echo Starting server...
npm run dev
