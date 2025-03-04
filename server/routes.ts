try {
        // Use Hugging Face's public model for image generation
        // This doesn't require an API key for basic usage
        log("Using Hugging Face's text-to-image model");

        // Create a payload for the Hugging Face API
        const payload = {
          inputs: prompt,
          options: {
            wait_for_model: true
          }
        };

        const options = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        };

        // Using a public model from Hugging Face
        const imageResponse = await fetch('https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0', options);

        if (!imageResponse.ok) {
          throw new Error(`Hugging Face API returned ${imageResponse.status}`);
        }

        // For Hugging Face, the response is the image blob directly
        // We need to create a base64 data URL from it
        const imageBuffer = await imageResponse.arrayBuffer();
        const base64Image = Buffer.from(imageBuffer).toString('base64');
        const imageUrl = `data:image/jpeg;base64,${base64Image}`;

        res.json({ 
          success: true,
          imageUrl: imageUrl,
          description: description,
          message: "Image generated successfully with Hugging Face Stable Diffusion"
        });
      } catch (error) {
        console.error("Error generating image:", error);
        res.status(500).json({ success: false, error: error.message });
      }