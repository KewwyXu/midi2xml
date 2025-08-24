module.exports = {
   apps: [
      {
         name: "midi2xml", // 你的应用名称
         script: "./lib/server/server.js", // 你的入口文件，如果是 npm start，这里可以是 ‘npm’
         args: "run start", // 如果 script 是 ‘npm’，则需要 args
         instances: "max", // 使用所有CPU核心来启动集群
         exec_mode: "cluster", // 集群模式
         env: {
            NODE_ENV: "development",
         },
         env_production: {
            NODE_ENV: "production", // 部署时传入这个环境变量
         },
      },
   ],
};
