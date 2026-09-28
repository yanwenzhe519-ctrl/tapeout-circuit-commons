export default async function handler(request, response) {
  const params = new URL(request.url, 'http://localhost').search
  const upstream = await fetch(`https://tapeout.work/api/v1/processors${params}`)
  response.status(upstream.status)
  response.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
  response.setHeader('Content-Type', 'application/json')
  response.send(await upstream.text())
}
