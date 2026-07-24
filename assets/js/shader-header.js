(function () {
    const canvas = document.getElementById('shader-header');
    if (!canvas) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return;

    const vertShader = `
        attribute vec2 aPosition;
        void main() {
            gl_Position = vec4(aPosition, 0.0, 1.0);
        }
    `;

    const fragShader = `
precision highp float;

#define OCTAVES 5

uniform float time;
uniform vec2 res;

// Referenced off of https://thebookofshaders.com/13/
// Specifically domain warping, exploring fractal brownian motion with cloud/gas shapes

float random (in vec2 coord) {
    return fract(sin(dot(coord, vec2(12.9898, 78.233))) * 43758.5453123);
}

float noiseGen (in vec2 coord) {
    vec2 i = floor(coord);
    vec2 f = fract(coord);
    
    float c1 = random(i);
    float c2 = random(i + vec2(1.0, 0.0));
    float c3 = random(i + vec2(0.0, 1.0));
    float c4 = random(i + vec2(1.0, 1.0));

    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix(c1, c2, u.x) + 
           (c3 - c1) * u.y * (1.0 - u.x) + 
           (c4 - c2) * u.x * u.y;
}

float gen_fBrownNoise(in vec2 coord) {
    float v = 0.0;
    float a = 0.5;

    vec2 shift = vec2(100.0);

    // mat2 rot = mat2(cos(0.75), -sin(0.75),
    //                 sin(0.75),  cos(0.75));

    // mat2 rot = mat2(cos(0.33), -sin(0.33),
    //                 sin(0.33),  cos(0.33));

    // mat2 rot = mat2(cos(0.5), -sin(0.5),
    //                 sin(0.5),  cos(0.5));

    // interesting graininess... like water
    mat2 rot = mat2(exp(0.5), -sin(0.75),
                    sin(0.75),  exp(0.5));

    // mat2 rot = mat2(exp(0.75), -exp(0.75),
    //                 exp(0.75),  exp(0.75));

    for (int i = 0; i < OCTAVES; ++i) {
        v += a * noiseGen(coord);

        coord = rot * coord * 2.0 + shift;
        a *= 0.5;
    }
    return v;
}

void main() {
    vec2 coord = (gl_FragCoord.xy) / res.y * 3.0;
    vec3 color = vec3(0.0);

    vec2 q;
    q.x = gen_fBrownNoise(coord + 0.0 * time);
    q.y = gen_fBrownNoise(coord + vec2(1.0));

    vec2 r;
    r.x = gen_fBrownNoise(coord + 1.0 * q + vec2(1.7, 9.2) + 0.15 * time);
    r.y = gen_fBrownNoise(coord + 1.0 * q + vec2(8.3, 2.8) + 0.126 * time);

    vec2 s;
    s.x = gen_fBrownNoise(coord + 1.0 * r + vec2(2.5, 8.2) + 0.2 * time);
    s.y = gen_fBrownNoise(coord + 1.0 * r + vec2(9.6, 3.0) + 0.14 * time);

    float f = gen_fBrownNoise(coord + r + gen_fBrownNoise(coord + s + gen_fBrownNoise(coord + r + gen_fBrownNoise(coord + s))));

    //float f = gen_fBrownNoise(coord + s + gen_fBrownNoise(coord + s + gen_fBrownNoise(coord + s + gen_fBrownNoise(coord + s + gen_fBrownNoise(coord + s + gen_fBrownNoise(coord + s + gen_fBrownNoise(coord + s + gen_fBrownNoise(coord + s + gen_fBrownNoise(coord + s + gen_fBrownNoise(coord + s + gen_fBrownNoise(coord + s + gen_fBrownNoise(coord + s))))))))))));

    color = mix(vec3(0.101961, 0.619608, 0.666667),
                vec3(0.666667, 0.666667, 0.498039),
                clamp((f * f) * 4.0, 0.0, 1.0));

    color = mix(color, 
                vec3(0, 0.6, 0.164706), 
                clamp(length(s.y), 1.0, 1.0));

    color = mix(color, 
                vec3(0.666667, 1, 1), 
                clamp(length(r.x), 0.5, 1.0));
    
    color = mix(color, 
                vec3(0.666667, 0.7, 0.7), 
                clamp(length(q), 0.3, 1.0));

    color = mix(color, 
                vec3(0.01, 0.0, 0.5555), 
                clamp(length(r.x) / 2.0, 0.0, 1.0));

    // VERY INTERESTING PURPLES
    // color = mix(color, 
    //             vec3(0.01, 0.0, 0.5555), 
    //             clamp(length(s.y) / 2.0, 0.5, 0.7));
    
    gl_FragColor = vec4((pow(f, 3.0) + 0.6 * pow(f, 2.0) + 0.5 * pow(f, 1.0)) * color * sin(color) / cos(color),
                    1.0);
}
    `;

    function compileShader(type, src) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, src);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error(gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    const vert = compileShader(gl.VERTEX_SHADER, vertShader);
    const frag = compileShader(gl.FRAGMENT_SHADER, fragShader);

    const program = gl.createProgram();
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program));
        return;
    }

    gl.useProgram(program);

    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
    const buffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const aPosition = gl.getAttribLocation(program, 'aPosition');
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

    // frag stuff
    const res = gl.getUniformLocation(program, 'res');
    const time = gl.getUniformLocation(program, 'time');

    function resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(canvas.clientWidth * dpr);
        canvas.height = Math.round(canvas.clientHeight * dpr);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform2f(res, canvas.width, canvas.height);
    }

    window.addEventListener('resize', resize);
    resize();

    let start = performance.now();
    function render(now) {
        gl.uniform1f(time, (now - start) * 0.001);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        if (!prefersReducedMotion) requestAnimationFrame(render);
    }
    requestAnimationFrame(render);

    const navLinks = document.querySelectorAll('.greedy-nav .visible-links a, .greedy-nav .hidden-links a');
    const shaderContainer = document.getElementById('shader-hover-container');
    const navWrap = document.querySelector('.greedy-nav')

    if (navLinks.length > 0 && shaderContainer && navWrap) {
        navWrap.style.position = 'relative';

        navLinks.forEach(link => {
            link.addEventListener('mouseenter', (e) => {
                // Get coordinates of the hovered link relative to the nav wrapper
                const linkRect = link.getBoundingClientRect();
                const navRect = navWrap.getBoundingClientRect();

                // Add some padding to the box (e.g., +10px wider/taller than the text)
                const paddingX = 16; 
                const paddingY = 8;

                // Move and resize the container
                shaderContainer.style.width = `${linkRect.width + paddingX}px`;
                shaderContainer.style.height = `${linkRect.height + paddingY}px`;
                shaderContainer.style.top = `${linkRect.top - navRect.top - (paddingY / 2)}px`;
                shaderContainer.style.left = `${linkRect.left - navRect.left - (paddingX / 2)}px`;
                
                // Fade it in
                shaderContainer.style.opacity = '1';

                // Force webgl to update its resolution uniform based on the new small size
                resize();
            });
        });

        navWrap.addEventListener('mouseleave', () => {
            shaderContainer.style.opacity = '0';
        });
    }
})();