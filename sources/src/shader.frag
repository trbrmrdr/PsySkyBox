precision highp float;
precision mediump float;

#ifdef GL_ES
precision highp float;
#endif

varying vec3 vNormal;
varying vec2 vUV;
uniform vec2 iResolution;

uniform sampler2D iChannel0;
uniform vec2 iMouse;
uniform float iTime;

uniform float elapsed;
uniform float tday;
uniform float d_startDay;

#define ORIG_CLOUD 1
uniform int extend_sun;

uniform float cloudy;
// #define cloudy  0.5 //0.0 clear sky
#define haze 0.01 * (cloudy * 20.)

#define rainmulti 5.0 // makes clouds thicker
#define fov tan(radians(60.0))
#define S(x, y, z) smoothstep(x, y, z)
#define cameraheight 6e1       // 50.
#define mincloudheight 5e3     // 5e3
#define maxcloudheight 8e3     // 8e3
#define xaxiscloud iTime * 5e2 // iTime*5e2 +iTime left -iTime right *speed
#define yaxiscloud 0.          // 0.
#define zaxiscloud iTime * 6e2 // iTime*6e2 +iTime away from horizon -iTime towards horizon *speed
#define cloudnoise 2e-4        // 2e-4

// Performance - 8 -16   if more very hight
//  const int steps = 8;
//  const int stepss = 8;
uniform int steps;
uniform int stepss;

uniform int step_fog;

// const float R0 = 6360e3; //planet radius //6360e3 actual 6371km
// const float Ra = 6380e3; //atmosphere radius //6380e3 troposphere 8 to 14.5km
uniform float R0;
uniform float Ra;
// const float I = 10.; //sun light power, 10.0 is normal
uniform float I;
// const float SI = 5.; //sun intensity for sun
uniform float SI;

const float ts = (cameraheight / 2.5e5);

// vec3 bM = vec3(21e-6); //normal mie
uniform vec3 bM;

// Rayleigh scattering (sky color, atmospheric up to 8km)
// vec3 bR = vec3(5.8e-6, 13.5e-6, 33.1e-6); //normal earth
//  vec3 bR = vec3(3.5e-6, 333.1e-6, 235.8e-6 ); //red-purple

uniform vec3 bR;

// vec3 C = vec3(0., -R0, 0.); //planet center
uniform vec3 C;

vec3 Ds = normalize(vec3(0., 0., -1.)); // sun direction

// AURORA STUFF
mat2 mm2(in float a)
{
    float c = cos(a);
    float s = sin(a);
    return mat2(c, s, -s, c);
}

mat2 m2 = mat2(0.95534, 0.29552, -0.29552, 0.95534);

float tri(in float x)
{
    return clamp(abs(fract(x) - .5), 0.01, 0.49);
}

vec2 tri2(in vec2 p)
{
    return vec2(tri(p.x) + tri(p.y), tri(p.y + tri(p.x)));
}

float triNoise2d(in vec2 p, float spd)
{
    float z = 1.8;
    float z2 = 2.5;
    float rz = 0.;
    p *= mm2(p.x * 0.06);
    vec2 bp = p;
    for (float i = 0.; i < 5.; i++)
    {
        vec2 dg = tri2(bp * 1.85) * .75;
        dg *= mm2(iTime * spd);
        p -= dg / z2;

        bp *= 1.3;
        z2 *= 1.45;
        z *= .42;
        p *= 1.21 + (rz - 1.0) * .02;

        rz += tri(p.x + tri(p.y)) * z;
        p *= -m2;
    }
    return clamp(1. / pow(rz * 29., 1.3), 0., .55);
}

float hash21(in vec2 n)
{
    return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
}
vec4 aurora(vec3 ro, vec3 rd)
{
    vec4 col = vec4(0);
    vec4 avgCol = vec4(0);
    ro *= 1e-5;
    float mt = 10.;
    for (float i = 0.; i < 5.; i++)
    {
        float of = 0.006 * hash21(gl_FragCoord.xy) * smoothstep(0., 15., i * mt);
        float pt = ((.8 + pow((i * mt), 1.2) * .001) - rd.y) / (rd.y * 2. + 0.4);
        pt -= of;
        vec3 bpos = (ro) + pt * rd;
        vec2 p = bpos.zx;
        // vec2 p = rd.zx;
        float rzt = triNoise2d(p, 0.1);
        vec4 col2 = vec4(0, 0, 0, rzt);
        col2.rgb = (sin(1. - vec3(2.15, -.5, 1.2) + (i * mt) * 0.053) * (0.5 * mt)) * rzt;
        avgCol = mix(avgCol, col2, .5);
        col += avgCol * exp2((-i * mt) * 0.04 - 2.5) * smoothstep(0., 5., i * mt);
    }

    col *= (clamp(rd.y * 15. + .4, 0., 1.2));
    return col * 2.8;
}

// END AURORA STUFF

float noise(in vec2 v)
{
    return textureLod(iChannel0, (v + .5) / 256., 0.).r;
}

// by iq
// https://www.iquilezles.org/www/articles/voronoise/voronoise.htm
// https://www.iquilezles.org/www/articles/morenoise/morenoise.htm
// https://www.iquilezles.org/www/articles/gradientnoise/gradientnoise.htm
float Noise(in vec3 x)
{
    vec3 p = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);

    vec2 uv = (p.xy + vec2(37.0, 17.0) * p.z) + f.xy;
    vec2 rg = texture(iChannel0, (uv + 0.5) / 256.0, -100.0).yx;
    return mix(rg.x, rg.y, f.z);
}

float fnoise(vec3 p, in float t)
{
    p *= .25;
    float f;

    f = 0.5000 * Noise(p);
    p = p * 3.02;
    p.y -= t * .1; // speed cloud
    f += 0.2500 * Noise(p);
    p = p * 3.03;
    p.y += t * .06;
    f += 0.1250 * Noise(p);
    p = p * 3.01;
    f += 0.0625 * Noise(p);
    p = p * 3.03;
    f += 0.03125 * Noise(p);
    p = p * 3.02;
    f += 0.015625 * Noise(p);
    return f;
}

float cloud(vec3 p, in float t)
{
    float cld = fnoise(p * cloudnoise, t) + cloudy * 0.1;
    cld = smoothstep(.4 + .04, .6 + .04, cld);
    cld *= cld * 25.0;
    return cld + haze;
}

#if ORIG_CLOUD == 1
float cloudnear = 1.0; // 9e3 12e3  //do not render too close clouds on the zenith
float cloudfar = 1e3;  // 15e3 17e3
#else
float cloudnear = 1.0; // 15e3 17e3
float cloudfar = 70e3; // 160e3  //do not render too close clouds on the horizon 160km should be max for cumulus
#endif

const float Hr = 4e3;   // Rayleigh scattering top //8e3
const float Hm = 1.2e3; // Mie scattering top //1.3e3

void densities(in vec3 pos, out float rayleigh, out float mie)
{
    float h = length(pos - C) - R0;
    rayleigh = exp(-h / Hr);
    vec3 d = pos;
    d.y = 0.0;
    float dist = length(d);

    float cld = 0.;
    if (mincloudheight < h && h < maxcloudheight)
    {
        cld = cloud(pos + vec3(iTime * 1e3, 0., iTime * 1e3), iTime) * cloudy;
        cld = cloud(pos + vec3(xaxiscloud, yaxiscloud, zaxiscloud), iTime) * cloudy; // direction and speed the cloud movers
        cld *= sin(3.1415 * (h - mincloudheight) / mincloudheight) * cloudy;
    }

#if ORIG_CLOUD
    if (dist < cloudfar)
    {
        float factor = clamp(1.0 - ((cloudfar - dist) / (cloudfar - cloudnear)), 0.0, 1.0);
        cld *= factor;
    }
#else

    if (dist > cloudfar)
    {

        float factor = clamp(1.0 - ((dist - cloudfar) / (cloudfar - cloudnear)), 0.0, 1.0);
        cld *= factor;
    }
#endif

    mie = exp(-h / Hm) + cld + haze;
}

float escape(in vec3 p, in vec3 d, in float R)
{
    //
    vec3 v = p - C;
    float b = dot(v, d);
    float c = dot(v, v) - R * R;
    float det2 = b * b - c;
    if (det2 < 0.)
        return -1.;
    float det = sqrt(det2);
    float t1 = -b - det, t2 = -b + det;
    return (t1 >= 0.) ? t1 : t2;
}

// https://www.scratchapixel.com/lessons/procedural-generation-virtual-worlds/simulating-sky
// http://nishitalab.org/user/nis/cdrom/sig93_nis.pdf
//коофиценты для рыбъего глаза
const float g = 0.45; // light concentration .76 //.45 //.6  .45 is normaL
const float g2 = g * g;

const float s = 0.999; // light concentration for sun
const float s2 = s * s;

uniform float phaseR_c; //.0596831
uniform float phaseM_c; // .1193662
uniform float phaseS_c; //.1193662

void scatter(vec3 o, vec3 d, out vec3 col, out vec3 scat)
{

    float L = escape(o, d, Ra);
    float mu = dot(d, Ds);
    float opmu2 = 1. + mu * mu;

    //слнце - микс цвета от центра - рыбий глаз
    //коофиценты для солнца относительно
    //точка картины  относительно солнца
    float phaseR = phaseR_c * opmu2;
    float phaseM = phaseM_c * (1. - g2) * opmu2 / ((2. + g2) * pow(1. + g2 - 2. * g * mu, 1.5));
    float phaseS = phaseS_c * (1. - s2) * opmu2 / ((2. + s2) * pow(1. + s2 - 2. * s * mu, 1.5));

    float depthR = 0., depthM = 0.;
    vec3 R = vec3(0.), M = vec3(0.);

    float dl = L / float(steps);
    for (int i = 0; i < steps; ++i)
    {
        float l = float(i) * dl;
        vec3 p = (o + d * l);

        float dR, dM;
        densities(p, dR, dM);
        dR *= dl;
        dM *= dl;
        depthR += dR;
        depthM += dM;

        float Ls = escape(p, Ds, Ra);
        if (Ls > 0.)
        {
            float dls = Ls / float(stepss);
            float depthRs = 0., depthMs = 0.;
            for (int j = 0; j < stepss; ++j)
            {
                float ls = float(j) * dls;
                vec3 ps = (p + Ds * ls);
                float dRs, dMs;
                densities(ps, dRs, dMs);
                depthRs += dRs * dls;
                depthMs += dMs * dls;
            }

            vec3 A = exp(-(bR * (depthRs + depthR) + bM * (depthMs + depthM)));
            R += (A * dR);
            M += A * dM;
        }
        else
        {
        }
    }

    col = (I) * (M * bR * (phaseM)); // Mie scattering
    col += (SI) * (M * bM * phaseS); // Sun
    col += (I) * (R * bR * phaseR);  // Rayleigh scattering

    scat = 0.1 * (bM * depthM);
}

vec3 hash33(vec3 p)
{
    p = fract(p * vec3(443.8975, 397.2973, 491.1871));
    p += dot(p.zxy, p.yxz + 19.27);
    return fract(vec3(p.x * p.y, p.z * p.x, p.y * p.z));
}

vec3 stars(in vec3 p)
{
    vec3 c = vec3(0.);
    float res = iResolution.x * 2.5;

    for (float i = 0.; i < 4.; i++)
    {
        vec3 q = fract(p * (.15 * res)) - 0.5;
        vec3 id = floor(p * (.15 * res));
        vec2 rn = hash33(id).xy;
        float c2 = 1. - smoothstep(0., .6, length(q));
        c2 *= step(rn.x, .0005 + i * i * 0.001);
        c += c2 * (mix(vec3(1.0, 0.49, 0.1), vec3(0.75, 0.9, 1.), rn.y) * 0.1 + 0.9);
        p *= 1.3;
    }
    return c * c * .8;
}

// SIMPLE SUN STUFF
const float PI = 3.14159265358979323846;
const float density = 0.5;
const float zenithOffset = 0.48;
const vec3 skyColor = vec3(0.37, 0.55, 1.0) * (1.0 + 0.0);

#define zenithDensity(x) density / pow(max(x - zenithOffset, 0.0035), 0.75)

float getSunPoint(vec2 p, vec2 lp)
{
    return smoothstep(0.04 * (fov / 2.0), 0.026 * (fov / 2.0), distance(p, lp)) * 50.0;
}

float getMie(vec2 p, vec2 lp)
{
    float mytest = lp.y < 0.5 ? (lp.y + 0.5) * pow(0.05, 20.0) : 0.05;
    float disk = clamp(1.0 - pow(distance(p, lp), mytest), 0.0, 1.0);
    return disk * disk * (3.0 - 2.0 * disk) * 0.25 * PI;
}

vec3 getSkyAbsorption(vec3 x, float y)
{
    vec3 absorption = x * y;
    absorption = pow(absorption, 1.0 - (y + absorption) * 0.5) / x / y;
    return absorption;
}

vec3 jodieReinhardTonemap(vec3 c)
{
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    vec3 tc = c / (c + 1.0);
    return mix(c / (l + 1.0), tc, tc);
}

vec3 getAtmosphericScattering(vec2 p, vec2 lp)
{
    float zenithnew = zenithDensity(p.y);
    // float sunPointDistMult = clamp(length(max(lp.y + 0.1 - zenithOffset, 0.0)), 0.0, 1.0);
    vec3 absorption = getSkyAbsorption(skyColor, zenithnew);
    vec3 sunAbsorption = getSkyAbsorption(skyColor, zenithDensity(lp.y + 0.1));
    vec3 sun3 = getSunPoint(p, lp) * absorption;
    // vec3 mie2 = getMie(p, lp) * sunAbsorption;
    vec3 totalSky = sun3; //+ mie2;
    totalSky *= sunAbsorption * 0.5 + 0.5 * length(sunAbsorption);
    vec3 newSky = jodieReinhardTonemap(totalSky);
    return newSky;
}
// END SIMPLE SUN STUFF

// FOG

#define EPSILON 0.1

#define time (iTime + 285.)

float hash(in float n)
{
    return fract(sin(n) * 43758.5453);
}

uniform float t_val_1;
uniform float t_val_2;
uniform float t_val_3;
uniform float fogFader;

//свет для дыма
vec3 lig()
{
    return normalize(vec3(2.5, 0.5, 0.6));
}

vec3 bgColor(const in vec3 rd)
{
    float sun = clamp(dot(lig(), rd), 0.0, 1.0);
    vec3 col = vec3(0.5, 0.52, 0.55) - rd.y * 0.2 * vec3(1.0, 0.8, 1.0) + 0.15 * 0.75;
    col += vec3(1.0, .6, 0.1) * pow(sun, 8.0);
    // col *= 0.95;
    return col;
}

#define CLOUDSCALE (50.)

// https://www.iquilezles.org/www/articles/fbm/fbm.htm
float cloudMap(const in vec3 p, const in float ani)
{
    vec3 r = p / CLOUDSCALE;

    float den = -1.8 + cos(r.y * 5. - 4.3);
    float f;
    vec3 q = 2.5 * r * vec3(0.75, 1.0, 0.75) + vec3(1.0, 2.0, 1.0) * ani * 0.15;
    f = 0.50000 * Noise(q);
    q = q * 2.02 - vec3(-1.0, 1.0, -1.0) * ani * 0.15;
    f += 0.25000 * Noise(q);
    q = q * 2.03 + vec3(1.0, -1.0, 1.0) * ani * 0.15;
    f += 0.12500 * Noise(q);
    q = q * 2.01 - vec3(1.0, 1.0, -1.0) * ani * 0.15;
    f += 0.06250 * Noise(q);
    q = q * 2.02 + vec3(1.0, 1.0, 1.0) * ani * 0.15;
    f += 0.03125 * Noise(q);

    return 0.065 * clamp(den + 2.4 * f, 0.0, 1.0);
}

vec3 raymarchClouds(const in vec3 ro, const in vec3 rd, const in vec3 bgc, const in vec3 fgc, const in float startdist, const in float maxdist, const in float ani)
{
    // dithering
    float t = startdist + CLOUDSCALE * 0.02 * hash(rd.x + 35.6987221 * rd.y + time); // 0.1*texture( iChannel0, fragCoord.xy/iChannelResolution[0].x ).x;

    // raymarch
    vec4 sum = vec4(0.0);
    for (int i = 0; i < step_fog; i++)
    {
        if (sum.a > 0.99 || t > maxdist)
            continue;

        vec3 pos = ro + t * rd;
        float a = cloudMap(pos, ani);

        // lighting
        float dif = clamp(0.1 + 0.8 * (a - cloudMap(pos + lig() * CLOUDSCALE, ani)), 0., 0.5);
        vec4 col = vec4((1. + dif) * fgc, a);
        col.rgb *= col.a;
        sum = sum + col * (1.0 - sum.a);

        // advance ray with LOD
        t += (0.03 * CLOUDSCALE) + t * 0.012;
    }

    // blend with background
    sum.xyz = mix(bgc, sum.xyz / (sum.w + 0.0001), sum.w);

    return clamp(sum.xyz, 0.0, 1.0);
}

// END FOG

void main()
{
    float AR = iResolution.x / iResolution.y;
    vec2 uv = vec2(2.0 * vUV.x - 1.0, vUV.y * 2.0 - 1.0);

    vec2 sunPos = vec2((0.7 - (0.05 * fov)), (1.0 - (0.05 * fov)));

    uv.x *= AR;

    float gradSun = mod(elapsed * 0.001 + (d_startDay * 0.01) * tday, tday) / tday * 2.0 * PI;
    sunPos = vec2(0.9 - 0.3 * cos(gradSun),
                  0.5 + 0.4 * sin(gradSun));

    Ds = normalize(vec3(sunPos.x - ((0.5 * AR)), sunPos.y - 0.5, (fov / -2.0)));

    vec3 O = vec3(0., cameraheight, 0.);
    vec3 D = normalize(vec3(uv, -fov));

    vec3 color = vec3(0.);
    vec3 scat = vec3(0.);
    float att = 1.;
    vec3 star = vec3(0.);
    vec4 aur = vec4(0.);

    float fade = smoothstep(0., 0.01, abs(D.y)) * 0.5 + 0.6;

    float staratt = 1. - min(1.0, (sunPos.y * 2.0));
    float scatatt = 1. - min(1.0, (sunPos.y * 2.2));

    // рендер относительно высоты камеру - почти центр экран - отрисовываем почти одноитоже
    //- меняя угол обзозра камеры и коофицента для микса слоёв рисунка
    //в зависимости от позици солнца сомтрим что рисовать сияние  или нерисовать сияние)
    //+ звёзды
    if (D.y < -ts)
    {
        float L = -O.y / D.y;
        O = O + D * L;
        D.y = -D.y;
        D = normalize(D + vec3(0, .003 * sin(iTime + 6.2831 * noise(O.xz + vec2(0., -iTime * 1e3))), 0.));
        att = .6;
        star = stars(D);
        
        //выключить сияние - закоментить эту строчку
        sunPos.y < 0.5 ? aur = smoothstep(0.0, 2.5, aurora(O, D)) : aur = aur;
    }
    else
    {
        float L1 = O.y / D.y;
        vec3 O1 = O + D * L1;

        vec3 D1 = vec3(1.);
        D1 = normalize(D + vec3(1., 0.0009 * sin(iTime + 6.2831 * noise(O1.xz + vec2(0., iTime * 0.8))), 0.));
        star = stars(D1);

        //выключить сияние - закоментить эту строчку
        sunPos.y < 0.5 ? aur = smoothstep(0., 1.5, aurora(O, D)) *fade : aur = aur;
    }

    star *= att;
    star *= staratt;

    scatter(O, D, color, scat);

    color *= att;
    scat *= att;
    scat *= scatatt;

    // двойной блин на солнце - свет через тучи и через горизонт
    if (extend_sun == 1)
    {
        vec2 uv1 = vUV;
        uv1.x *= AR;
        vec3 sun2 = getAtmosphericScattering(uv1, vec2(sunPos.x, sunPos.y));
        color += sun2;
    }

    color += scat;
    color += star;
    color = color * (1. - (aur.a) * scatatt) + (aur.rgb * scatatt);
    color += aur.rgb * scatatt;

    if (fogFader > 0.0)
    {
        //________________________________________________________________
        vec2 q = uv;
        vec2 p = -1.0 + 2.0 * q;

        // camera parameters
        // vec3 ro = vec3(iMouse.x*5., iMouse.y*2., 0.0);
        // vec3 ta = vec3(t_val_1*100.,t_val_2*10.,1.0);

        vec3 ro = vec3(5., 0.92, 0.0);
        vec3 ta = vec3(5.0, 2.0, 1.0);

        // build ray
        vec3 ww = normalize(ta - ro);
        vec3 uu = normalize(cross(vec3(0.0, 1.0, 0.0), ww));
        vec3 vv = normalize(cross(ww, uu));
        vec3 rd = normalize(p.x * uu + p.y * vv + 2.5 * ww);

        float fresnel, refldist = 5000., maxdist = 5000.;
        vec3  col = bgColor(rd);
        vec3 bgc = col;

    
        col = raymarchClouds(ro, rd, col, bgc, 150., maxdist, time * 5.);

        col = pow(col, vec3(0.7));

        // contrast, saturation and vignetting
        col = col * col * (3.0 - 1.5 * col);
        col = mix(col, vec3(dot(col, vec3(0.33))), -0.5);
        // col *= 0.25 + 0.75*pow( 16.0*q.x*q.y*(1.0-q.x)*(1.0-q.y), 0.1 );

        gl_FragColor = vec4(col, 1.0);
        vec3 layer_1 = vec4(pow(color, vec3(1.0 / 2.2)), 1.).xyz; // gamma correct

        gl_FragColor = vec4(mix(col, layer_1, 1.0 - col * fogFader), 1.0);
    }
    else
    {
        gl_FragColor = vec4(pow(color, vec3(1.0 / 2.2)), 1.); // gamma correct
    }

    // gl_FragColor = vec4(pow(color, vec3(1.0 / 2.2)), 1.); //gamma correct
}