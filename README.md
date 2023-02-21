# feishu-js-sdk

飞书简单版的 JavaScript SDK。

使用前你需要将你的飞书应用 AppID 和 Secret 配置到你的环境变量中，如果使用 [AirCode](https://aircode.io) 就是配置在右侧的 Environment 中。

## 方法列表

### getTenantToken

获取 tenant_access_token 的方法


### getChats

快速获取机器人所在前 100 个群的方法

### getAllChats

获取机器人所在的所有群方法

### sendMsg

发送单条消息的方法

### sendMsgToAllChats

发送多条消息，支持频控的批量发送

### getUserIdByEmail

通过 email 换取 userId

### saveImageToLark

传入图片 URL 和图片名，即可上传至 Lark 中，并且返回 imageId
