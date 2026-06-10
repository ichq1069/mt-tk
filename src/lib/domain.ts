/**
 * 获取当前访问的域名基础地址 (协议 + 域名)
 * @returns 
 */
export function getCurrentDomain() {
  const { protocol, host } = window.location;
  // 去除末尾斜杠
  return `${protocol}//${host}`.replace(/\/$/, '');
}

/**
 * 验证并提取域名参数
 */
export function getDomainParams() {
  return {
    domainUrl: getCurrentDomain()
  };
}
