const salt = 'Zingle_';
const encrypt = (str) => {
  const salted = salt + str;
  const b64 = Buffer.from(encodeURIComponent(salted)).toString('base64');
  return '__ENC_Z__' + b64.split('').reverse().join('');
};

console.log('BASE_URL:', encrypt('https://supabase.wo58.cn/functions/v1/app-management'));
console.log('DEFAULT_SUPABASE_URL:', encrypt('https://supabase.wo58.cn/functions/v1/app-auth'));
console.log('DEFAULT_SUPABASE_ANON_KEY:', encrypt('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc0NzEzNjAwLCJleHAiOjE5MzI0ODAwMDB9.qxmNjhwOCQOP7cANaWsjWK3hxhEuFnkrAMLd7m7gybQ'));
