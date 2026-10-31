---
title: "Real-Time Watercolor Stylization"
caption: "Real-Time Watercolor Stylization based on Montesdeoca et. al's work"
# Demo reel for the panel header. Accepts a full YouTube URL, a youtu.be
# link, an /embed/ URL, or a bare video ID. Takes priority over `image`.
video: "https://youtu.be/jbuTZxfVefM"
github: "https://github.com/tongponghong/15472_watercolor"
image: ""
accent: "c"
---

### Real-Time Watercolor Stylization
[Link to repo](https://github.com/tongponghong/15472_watercolor)

I worked with [Ollie Arrison](https://olliearrison.github.io/#/) at the end of 15472 to implement this paper:
[Art-directed watercolor stylization of 3D animations in real-time by Montesdeoca et. al](https://www.sciencedirect.com/science/article/pii/S0097849317300316)
![Watercolor pipeline](/assets/images/watercolor/pipeline.png)

We distributed the work mainly where I handled the boilerplate and pipeline and they handled the shaders and art changes.
This pipeline above can be summarized as so: 
## Code Organization + Render Passes
### (Before) Barrier 1:
We derive all of our color image and control image output from the object fragment shader. The color image is just the direct outColor, and the control image is randomly generated noise based on fractal brownian motion and the position of the vertices from the vertex shader. 
The depth image is derived from the object data and we use the swapchain_depth_image that is included in tutorial.cpp from the nakluV tutorial. 
The blurred and bled images are both prepared to be in the right format (VK_IMAGE_LAYOUT_GENERAL) as outputs of the blur and bilateral blur shaders. 
### (Before) Barrier 2:
The blurred image and bled image are now switched from being written to to being read from since they are now inputs into the stylization shader. 
Final output is now being prepared to be in the correct format (VK_IMAGE_LAYOUT_GENERAL)
### (Before) Barrier 3:
The final image is now changed to be VK_IMAGE_LAYOUT_TRANSFER_SRC_OPTIMAL so that it is ready to be copied to the swapchain image 
Swapchain image output is now being prepared to be in the correct format (VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL)


## Pipeline Organization

### ObjectsPipeline
<p>
The setup of the objects pipeline was mostly kept the same. Within the fragment shader, we aimed to replicate the watercolor reflectance model, as described in the paper Art-directed watercolor stylization of 3D animations in real-time. Rather than interpreting lighting through a physically-based model, we used water dilution to represent lighter or darker areas. This matches how artists use water to dilute the paint, resulting in lighter values. The dilution area was calculated by summing over the lights.
The dilution area can intuitively be thought of then as all the area the light touches on a specific surface/mesh. This is not to be confused with the dilution variable, which controls how strongly the color gets diluted towards the paper color. 
</p>
<!-- <p>
The cangiante effect is a non-realistic shift in color as the value shifts from dark to light. Within the paper, this is calculated by adding the cangiante color associated with a given weight to the original scene color. Although this method results in a color shift as the color goes from light to dark, it doesn't entirely capture the transparency-based layering of watercolor paints. Often painters begin by applying a thin layer of blue paint, which appears darker when layered over with the true color of the object in the scene. In order to achieve this, I used the equations for alpha over, setting the background color to the cangiante color, the background opacity to the cangiante strength, the foreground color to the base color, and the foreground opacity to the dilution area. 
We replicated the cangiante effect according to the paper, which resulted in the following image:</p> -->
<img src="/assets/images/watercolor/Frag Shader/I (accurateToPaper).png" alt="">
Although this resulted in color shift from the original texture, it involved adding the offset color to the original albedo, which makes the color brighter. However, often with watercolor, since this effect is acheived through layering, it results in darkening certain areas of the painting according to this effect. Using our version, we got the following image:
<img src="/assets/images/watercolor/Style Shader/I.png" alt="">

### ComputePipeline
The ComputePipeline directs the Gaussian Blur shader (gaussian.comp). Since it only involves one input image and one output image, it has 2 bindings. Since the paper suggested using a constant and small kernel size, the kernel was created using the python script computeKernel.py.
The result of the gaussian filter over the scene can be seen below. 
<img src="/assets/images/watercolor/Style Shader/Ib.png" alt="">

### BleedPipeine
The BleedPipeline directs the 4D Bilateral Blur shader (bilateral.comp). Since there are 3 input images and 1 output image, it has 4 bindings. The goal of the bilateral filter is to replicate the bleeding seen in watercolor. 
In order to acheive this effect, it blurs areas of the painting together based on the depth of the surrounding pixels. In order to get the flattened depth, 
we added the near and far clipping values as push constants and used them to linearize the depth, which resulted in the following image:


<img src="/assets/images/watercolor/Bleed Shader/depth.png" alt="">

Then, the following image shows the pixels that are nearby that are sufficiently far enough behind the current pixel. 

<img src="/assets/images/watercolor/Bleed Shader/sourceBehind.png" alt="">

Following the paper resulted in this image which allows color to blur from areas that are in front but not from areas that are behind.

<img src="/assets/images/watercolor/Bleed Shader/accurateToPaper.png" alt="">

Since we found that this reduced the detail within the scene, we choose to avoid blurring over areas with significant depth change. This allowed much of the silhouette to be preserved while still bluring much of the image. 
<img src="/assets/images/watercolor/Bleed Shader/notAccurate.png" alt="">



### StylePipeline
The StylePipeline is the final pipeline that directs the final stylization shader (style.comp). Since there are 5 input images and 1 output image, it has 6 bindings total. Using the control image, which was set using FBM noise generated in the fragment shader, the gaussian blurred image and the bleed image are combined to result in an image that blurs some areas while sharpening others. 

<img src="/assets/images/watercolor/Style Shader/Ied.png" alt="">

The paper texture is layered on top, resulting in the final image:

<img src="/assets/images/watercolor/Style Shader/final.png" alt="">

If all previously mentioned effects are set to match the original paper it produces the following image. 
<img src="/assets/images/watercolor/B.png" alt="">


<!-- <figure>
<!-- Feel free to use and duplicate the below example graph to plot data
 	 Edit labels and variables in script below the canvas -->
<!-- <canvas id="Bilateral-blur-data" style="display:block; width:100%; max-width:600px; margin:0 auto; background:#fff;"></canvas>
<figcaption>
The frame time performance based on various kernel sizes for our bilateral blur filter. The gaussian blur remained at an 11 size kernel. 
</figcaption>
</figure>
<script> -->
<!-- //adding an event listener so that this chart gets made *after* the document loads:
// window.addEventListener('load', () => {
// 	const lights     = [5, 11, 21, 51, 75, 101];
// 	const frameTimeMean = [1.097, 1.122, 1.312, 1.727, 2.742, 3.450];
// 	const frameTimeMedian = [1.180, 1.171, 1.268, 1.788, 2.703, 3.395];
// 	//if your tone mapping handles color channels separately

// 	<!-- // Chart.js supports many types of charts and configuration options.
// 	//   See: https://www.chartjs.org/docs/latest/ -->
<!-- // 	new Chart("Bilateral-blur-data", {
// 		type: "line",
// 		data: {
// 			labels: lights,
// 			datasets: [
// 				{ label: "Bilateral blur mean", data: frameTimeMean, backgroundColor:'#f00', borderColor:'#f00' },
// 				{ label: "Bilateral blur median", data: frameTimeMedian, backgroundColor:'#0f0', borderColor:'#0f0' },
// 			]
// 		},
// 		options: {
// 			plugins: {
// 				title: { display: true, text: "Lighting Performance" }, //show a chart title
// 				legend: { display: true, onClick:()=>{} }, //show legend but don't allow interacting
// 			},
// 			scales: {
// 				y:{
// 					min:0, //having y-axis start at zero provides better relative view of data
// 					title: { display:true, text:"frame time (ms)" },
// 				},
// 				x:{
// 					title: { display:true, text:"kernel size (k x k)" },
// 				},
// 			},
// 			animation:false, //don't animate in the data sets
// 		}
// 	});
// }); -->
<!-- </script> --> 

