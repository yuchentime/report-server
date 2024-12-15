export async function executeSave(sql: string) {
  try {
    const response = await fetch(process.env.CLOUDFLARE_DATABASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.CLOUDFLARE_SECRET_TOKEN}`,
      },
      body: JSON.stringify({ sql }),
    });
    if (response.ok) {
      console.log('Data saved successfully');
    } else {
      console.error('Error saving data:', response.statusText);
    }
  } catch (error) {
    console.error('Error saving data:', error?.message);
  }
}

export async function executeQuery(sql: string) {
  const queryUrl = `${process.env.CLOUDFLARE_DATABASE_URL}?query=${encodeURIComponent(sql)}`;
  let response;
  try {
    response = await fetch(queryUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.CLOUDFLARE_SECRET_TOKEN}`,
      },
    });
  } catch (error) {
    console.error('查询错误: ', error.message);
    return {
      totalCount: 0,
      results: [],
    };
  }
  if (!response.ok) {
    console.error('查询异常: ', sql);
    return {
      totalCount: 0,
      results: [],
    };
  }
  return await response.json();
}
