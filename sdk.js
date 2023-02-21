const axios = require('axios');
const FormData = require('form-data');

// 引入依赖
const imageSize = require('image-size');

// 获取 tenant_access_token ，相关 id 都可以存储在轻服务的环境变量中
const getTenantToken = async () => {
  const appId = process.env.appId;
  const appSecret = process.env.appSecret;
  if (appId && appSecret) {
    const res = await axios.post('https://open.feishu.cn/open-apis/v3/auth/tenant_access_token/internal/', {
      "app_id": appId,
      "app_secret": appSecret,
    });
    return res.data.tenant_access_token;
  } else {
    console.log('AppID or Secret is null.');
    return null;
  }
};

// 获取机器人所在群
const getChats = async (pageToken) => {
  // 每次获取一下最新的 tenant_access_token
  const tenantToken = await getTenantToken();
  const data = {};
  if (pageToken) data.page_token = pageToken;
  const res = await axios({
    method: 'post',
    // 获取机器人所在群列表接口
    url: 'https://open.feishu.cn/open-apis/chat/v4/list',
    headers: {
      'Authorization': `Bearer ${tenantToken}`,
    },
    data,
  });
  return res.data.data;
};

// 发送消息方法
const sendMsg = async (obj) => {
  // 每次获取一下最新的 tenant_access_token
  const tenantToken = await getTenantToken();

  try {
    const res = await axios({
      method: 'post',
      // 发送消息接口
      url: obj.webhook || 'https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=chat_id',
      data: {
        receive_id: obj.chatId,
        msg_type: 'post',
        post: obj.post,
        content: obj.webhook ? { post: { "zh_cn": obj.post } } : JSON.stringify({ "zh_cn": obj.post }),
      },
      headers: {
        'Authorization': `Bearer ${tenantToken}`,
      },
    });
    return res;
  } catch (err) {
    console.log(err.response.data);
    console.log(err.response.data.error.field_violations);
    return null;
  }
};

// 真正对外暴露的公有方法
module.exports = {
  // 获取 tenant_access_token 的方法
  getTenantToken,
  // 获取机器人所在群的方法
  getChats,
  // 获取当前机器人所在的所有群，串行获取，直至全部取到
  getAllChats: async () => {
    let chats = [];
    let hasMore = true;
    let pageToken = null;
    // 批量分页获取群列表
    while (hasMore) {
      const c = await getChats(pageToken);
      chats = chats.concat(c.groups);
      hasMore = c.has_more;
      pageToken = c.page_token;
    }
    return chats;
  },
  // 发送单条消息的方法
  sendMsg,
  // 发送多条消息，支持频控的批量发送
  sendMsgToAllChats: async (objArray) => {
    const maxLength = 40;
    const send = async (i, t) => {
      await sendMsg(objArray[i]);
    };
    for (let i = 0; i < objArray.length; i++) {
      // 每 maxLength 个每秒一起发送
      await send(i, Math.floor(i / maxLength) * 800);
    }
  },
  // 通过 email 换取 userId
  getUserIdByEmail: async (email) => {
    const tenantToken = await getTenantToken();
    return axios({
      method: 'post',
      url: 'https://open.feishu.cn/open-apis/user/v4/email2id',
      data: { email },
      headers: {
        'Authorization': `Bearer ${tenantToken}`,
      },
    });
  },
  // 传入图片 URL 和图片名，即可上传至 Lark 中，并且返回 imageId
  saveImageToLark: async function(url, fileName) {
    const res = await axios.get(url, {
      responseType: 'arraybuffer',
    });
    const size = imageSize(res.data);

    // 有文件并且大于 1kb
    if (res.data && res.data.length > 1024) {
      const tenantToken = await getTenantToken();
      const formData = new FormData();
      formData.append('image', res.data, {
        filename: fileName || 'unnamed',
        contentType: 'image/webp',
        knownLength: res.data.length,
      });
      formData.append('image_type', 'message');

      const formDataHeaders = formData.getHeaders();
      formDataHeaders.Authorization = `Bearer ${tenantToken}`;

      let saveImageRes;
      try {
        saveImageRes = await axios.post('https://open.feishu.cn/open-apis/im/v1/images', formData, {
          headers: formDataHeaders,
        });
        saveImageRes.data.data.size = size;
      } catch (err) {
        console.log(err.response.data);
        return null;
      }     
      return saveImageRes.data.data;
    }

    return null;
  },
}
