import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0"
import { jsPDF } from "https://esm.sh/jspdf@2.5.1"
import { createHash, createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

// AWS Signature V4 helpers
function hmacSha256(key: Uint8Array | string, data: string | Uint8Array): Uint8Array {
  const hmac = createHmac('sha256', key)
  hmac.update(data)
  return new Uint8Array(hmac.digest())
}

function sha256(data: string | Uint8Array) {
  const hash = createHash('sha256')
  hash.update(data)
  return hash.digest('hex')
}

function getSignatureKey(key: string, dateStamp: string, regionName: string, serviceName: string): Uint8Array {
  const kDate = hmacSha256('AWS4' + key, dateStamp)
  const kRegion = hmacSha256(kDate, regionName)
  const kService = hmacSha256(kRegion, serviceName)
  const kSigning = hmacSha256(kService, 'aws4_request')
  return kSigning
}

async function deleteFromR2(fileName: string, config: any) {
  const { endpoint, key_id, secret_key, bucket_name } = config
  const endpointUrl = new URL(endpoint)
  const host = endpointUrl.hostname
  const region = 'auto'
  const service = 's3'
  const canonicalUri = `/${bucket_name}/${fileName}`
  const now = new Date()
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
  const dateStamp = amzDate.slice(0, 8)
  const payloadHash = sha256('') // Empty body for DELETE
  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date'
  const canonicalRequest = ['DELETE', canonicalUri, '', canonicalHeaders, signedHeaders, payloadHash].join('\n')
  const algorithm = 'AWS4-HMAC-SHA256'
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`
  const stringToSign = [algorithm, amzDate, credentialScope, sha256(canonicalRequest)].join('\n')
  const signingKey = getSignatureKey(secret_key, dateStamp, region, service)
  const signatureArr = Array.from(hmacSha256(signingKey, stringToSign))
  const signature = signatureArr.map(b => b.toString(16).padStart(2, '0')).join('')
  const authorizationHeader = `${algorithm} Credential=${key_id}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
  const deleteUrl = `${endpoint.replace(/\/+$/, '')}${canonicalUri}`
  
  await fetch(deleteUrl, {
    method: 'DELETE',
    headers: {
      'Host': host,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
      'Authorization': authorizationHeader,
    }
  })
}

async function uploadToR2(fileBytes: Uint8Array, fileName: string, contentType: string, config: any) {
  const { endpoint, key_id, secret_key, bucket_name, custom_domain } = config
  const endpointUrl = new URL(endpoint)
  const host = endpointUrl.hostname
  const region = 'auto'
  const service = 's3'
  const canonicalUri = `/${bucket_name}/${fileName}`
  const now = new Date()
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
  const dateStamp = amzDate.slice(0, 8)
  const payloadHash = sha256(fileBytes)
  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`
  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date'
  const canonicalRequest = ['PUT', canonicalUri, '', canonicalHeaders, signedHeaders, payloadHash].join('\n')
  const algorithm = 'AWS4-HMAC-SHA256'
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`
  const stringToSign = [algorithm, amzDate, credentialScope, sha256(canonicalRequest)].join('\n')
  const signingKey = getSignatureKey(secret_key, dateStamp, region, service)
  const signatureArr = Array.from(hmacSha256(signingKey, stringToSign))
  const signature = signatureArr.map(b => b.toString(16).padStart(2, '0')).join('')
  const authorizationHeader = `${algorithm} Credential=${key_id}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
  const uploadUrl = `${endpoint.replace(/\/+$/, '')}${canonicalUri}`
  
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Host': host,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
      'Authorization': authorizationHeader,
      'Content-Type': contentType,
    },
    body: fileBytes
  })
  
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`R2 upload failed: ${response.status} ${text}`)
  }
  
  return custom_domain ? `${custom_domain.replace(/\/+$/, '')}/${fileName}` : `${endpoint.replace(/\/+$/, '')}/${bucket_name}/${fileName}`
}

async function fetchImageAsBase64(url: string): Promise<{ data: string; format: string } | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const blob = await response.blob()
    const buffer = await blob.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    const base64 = btoa(binary)
    const format = url.split('.').pop()?.toLowerCase() || 'jpeg'
    return { data: base64, format: (['jpg', 'jpeg', 'png'].includes(format) ? format : 'jpeg') }
  } catch (e) {
    console.error(`Failed to fetch image: ${url}`, e)
    return null
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { albumId, level, scope: reqScope } = await req.json()
    const scope = (albumId === 'all' || reqScope === 'all') ? 'all' : (reqScope || '');
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')

    const { data: config } = await supabase.from('storage_configs').select('*').single()
    if (!config || !config.endpoint) throw new Error('R2 configuration missing')

    const doc = new jsPDF()
    let fileName = ''

    if (scope === 'all') {
      fileName = `all_albums_summary_${Date.now()}.pdf`
      doc.setFontSize(24)
      doc.text("Album Summary Report", 105, 20, { align: "center" })
      doc.setFontSize(10)
      const now = new Date();
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      doc.text(`Export Date: ${dateStr}`, 105, 28, { align: "center" })
      
      const { data: albums } = await supabase.from('photo_albums').select('*').order('created_at', { ascending: false })
      
      if (albums) {
        let y = 40
        for (const album of albums) {
          if (y > 230) { doc.addPage(); y = 20; }
          doc.setFontSize(16)
          doc.text(album.title || "Untitled Album", 10, y)
          doc.setFontSize(10)
          doc.text(`Type: ${album.album_type || 'N/A'} | Photos: ${album.photo_count}`, 10, y + 7)
          doc.text(`Info: ${album.description || 'N/A'}`, 10, y + 14)

          if (album.cover_url) {
            const img = await fetchImageAsBase64(album.cover_url)
            if (img) {
              try {
                const props = doc.getImageProperties(img.data)
                const ratio = props.width / props.height
                const thumbWidth = 30
                const thumbHeight = thumbWidth / ratio
                doc.addImage(img.data, img.format === 'png' ? 'PNG' : 'JPEG', 160, y - 5, thumbWidth, thumbHeight)
              } catch (e) {
                console.error('Error adding cover image to PDF', e)
              }
            }
          }
          y += 35
        }
      }
      
      // Upload and return for 'all' scope
      try {
        const pdfOutput = doc.output('arraybuffer')
        const finalUrl = await uploadToR2(new Uint8Array(pdfOutput), `album_pdfs/${fileName}`, 'application/pdf', config)
        return new Response(JSON.stringify({ success: true, url: finalUrl, method: 'jsPDF', scope: 'all' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      } catch (e) {
        throw new Error(`Summary PDF generation failed: ${e.message}`)
      }

    } else if (albumId) {
      // 1. Fetch album
      const { data: album, error: albumErr } = await supabase.from('photo_albums').select('*').eq('id', albumId).single()
      if (albumErr || !album) throw new Error('Album not found')

      // 2. Fetch photos
      let query = supabase.from('album_photos')
        .select('*')
        .eq('album_id', albumId)
        .order('sort_order', { ascending: true })

      // 如果 level 是 'all'，则不应用任何过滤，包含所有状态（包括 pending）
      if (level && level !== 'all') {
        query = query.eq('level', level)
      } else if (!level || level === 'all') {
        // 如果未指定等级或明确要求全部，则不再过滤掉 'pending'
        // 只有在特定业务逻辑需要过滤时才启用以下逻辑，但目前用户反馈报错是因为没有图片
        // 所以我们改为全量获取
      }

      const { data: photos } = await query

      if (!photos || photos.length === 0) {
        console.error(`No photos found in album ${albumId} for level ${level}`);
        throw new Error(`No photos found in album (Level: ${level || 'All'})`)
      }

      // Calculate photos hash
      const photosHash = sha256(JSON.stringify(photos.map(p => ({ id: p.id, url: p.url, level: p.level, sort_order: p.sort_order }))))
      const levelKey = (level === 'all' || !level) ? 'all' : level
      
      // Check if PDF already exists and photos haven't changed
      if (album.pdf_urls?.[levelKey] && album.album_hashes?.[levelKey] === photosHash) {
        return new Response(JSON.stringify({ success: true, url: album.pdf_urls[levelKey], cached: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      
      fileName = `album_${albumId}_${levelKey}_${Date.now()}.pdf`
      
      // Page 1: Title and info
      doc.setFontSize(26)
      doc.text(album.title || "Album", 105, 50, { align: "center" })
      doc.setFontSize(12)
      doc.text(`Info: ${album.description || 'N/A'}`, 105, 70, { align: "center" })
      const now = new Date();
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      doc.text(`Export Date: ${dateStr}`, 105, 80, { align: "center" })

      if (album.cover_url) {
        const img = await fetchImageAsBase64(album.cover_url)
        if (img) {
          try {
            const props = doc.getImageProperties(img.data)
            const ratio = props.width / props.height
            let imgW = 100
            let imgH = imgW / ratio
            if (imgH > 150) {
              imgH = 150
              imgW = imgH * ratio
            }
            doc.addImage(img.data, img.format === 'png' ? 'PNG' : 'JPEG', (210 - imgW) / 2, 100, imgW, imgH)
          } catch (e) { console.error('Error adding main cover', e) }
        }
      }

      // 优化：分批获取图片，避免并发量过大导致 WorkerRequestCancelled
      const CHUNK_SIZE = 3; // 降低并发量到 3 个，提高稳定性
      const photoResults = [];
      for (let i = 0; i < photos.length; i += CHUNK_SIZE) {
        const chunk = photos.slice(i, i + CHUNK_SIZE);
        const chunkPromises = chunk.map(async (photo) => {
          const img = await fetchImageAsBase64(photo.url);
          return { photo, img };
        });
        const chunkResults = await Promise.all(chunkPromises);
        photoResults.push(...chunkResults);
      }

      // Subsequent pages: One photo per page
      for (const { photo, img } of photoResults) {
        doc.addPage()
        if (img) {
          try {
            const props = doc.getImageProperties(img.data)
            const ratio = props.width / props.height
            
            // Page size A4 is 210 x 297
            let drawW = 190
            let drawH = drawW / ratio
            
            // If height overflows page, scale based on height
            if (drawH > 250) {
              drawH = 250
              drawW = drawH * ratio
            }
            
            // Center image on page
            const x = (210 - drawW) / 2
            const y = (297 - drawH) / 2
            
            doc.addImage(img.data, img.format === 'png' ? 'PNG' : 'JPEG', x, y, drawW, drawH, undefined, 'FAST')
            doc.setFontSize(8)
            doc.text(`[${photo.level}] Photo ID: ${photo.id}`, 105, 285, { align: "center" })
          } catch (e) {
            doc.text('Failed to embed image', 105, 140, { align: "center" })
            console.error('Error embedding image', e)
          }
        } else {
          doc.text('Image load failed', 105, 140, { align: "center" })
        }
      }

      // Primary Solution: jsPDF
      try {
        const pdfOutput = doc.output('arraybuffer')
        const finalUrl = await uploadToR2(new Uint8Array(pdfOutput), `album_pdfs/${fileName}`, 'application/pdf', config)

        // Update database and manage PDF versions (Keep max 2)
        console.log(`Fetching current album data for ${albumId}`)
        const { data: currentAlbum, error: fetchError } = await supabase.from('photo_albums').select('pdf_urls, album_hashes, pdf_history').eq('id', albumId).single()
        
        if (fetchError) {
          console.error(`Failed to fetch album data for ${albumId}:`, fetchError)
          // Still proceed but with empty data if it's just a 406/Not Found, but here we expect it to exist
        }
        
        const pdfUrls = currentAlbum?.pdf_urls || {}
        const pdfHistory = currentAlbum?.pdf_history || {}
        const newHashes = currentAlbum?.album_hashes || {}

        // Ensure history for this level exists as an array
        if (!Array.isArray(pdfHistory[levelKey])) {
          pdfHistory[levelKey] = []
        }
        
        // Add new URL to history
        pdfHistory[levelKey].push(finalUrl)
        
        // Keep at most 2 versions in history and storage
        while (pdfHistory[levelKey].length > 2) {
          const oldestUrl = pdfHistory[levelKey].shift()
          if (oldestUrl) {
            try {
              const oldestFileName = oldestUrl.split('/').pop()?.split('?')[0]
              if (oldestFileName) {
                await deleteFromR2(`album_pdfs/${oldestFileName}`, config)
              }
            } catch (deleteErr) {
              console.error('Failed to delete oldest PDF from R2', deleteErr)
            }
          }
        }

        // Update with new URL and hash
        pdfUrls[levelKey] = finalUrl
        newHashes[levelKey] = photosHash
        
        const updateData: any = { 
          pdf_urls: pdfUrls,
          album_hashes: newHashes,
          pdf_history: pdfHistory,
          updated_at: new Date().toISOString()
        }

        // 核心修复：如果是全部等级的内容，同步更新到主表的 download_url 字段，满足需求 2.26.3
        if (levelKey === 'all') {
          updateData.download_url = finalUrl
        }
        
        console.log(`Updating album ${albumId} with data:`, JSON.stringify(updateData))
        const { error: updateError } = await supabase.from('photo_albums').update(updateData).eq('id', albumId)
        
        if (updateError) {
          console.error(`Database update failed for album ${albumId}:`, updateError)
          throw new Error(`Database update failed: ${updateError.message}`)
        }

        console.log(`Database update successful for album ${albumId}`)

        return new Response(JSON.stringify({ success: true, url: finalUrl, method: 'jsPDF' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      } catch (jspdfError) {
        console.error('jsPDF generation or upload failed', jspdfError)
        throw new Error(`PDF generation failed: ${jspdfError.message}`)
      }
    }

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
