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
// #define EXTEND_SUN 1
uniform int extend_sun;
#define SOFT_SUN 0

uniform float cloudy;
// #define cloudy  0.5 //0.0 clear sky
#define haze  0.01 * (cloudy*20.)

#define rainmulti 5.0 // makes clouds thicker
#define fov tan(radians(60.0))
#define S(x, y, z) smoothstep(x, y, z)
#define cameraheight 6e1 //50.
#define mincloudheight 5e3 //5e3
#define maxcloudheight 8e3 //8e3
#define xaxiscloud iTime*5e2 //iTime*5e2 +iTime left -iTime right *speed
#define yaxiscloud 0. //0.
#define zaxiscloud iTime*6e2 //iTime*6e2 +iTime away from horizon -iTime towards horizon *speed
#define cloudnoise 2e-4 //2e-4

//Performance
// const int steps = 8; //16 is fast, 128 or 256 is extreme high
// const int stepss = 8; //16 is fast, 16 or 32 is high 
uniform int steps;
uniform int stepss;



uniform float phaseR_c;//.0596831
uniform float phaseM_c;// .1193662
uniform float phaseS_c;//.1193662

// const float R0 = 6360e3; //planet radius //6360e3 actual 6371km
// const float Ra = 6380e3; //atmosphere radius //6380e3 troposphere 8 to 14.5km
uniform float R0;
uniform float Ra;
// const float I = 10.; //sun light power, 10.0 is normal
uniform float I;
// const float SI = 5.; //sun intensity for sun
uniform float SI;
const float g = 0.45; //light concentration .76 //.45 //.6  .45 is normaL
const float g2 = g * g;

const float ts = (cameraheight / 2.5e5);

const float s = 0.999; //light concentration for sun
#if SOFT_SUN == 1
const float s2 = s;
#else
const float s2 = s * s;
#endif
const float Hr = 4e3; //Rayleigh scattering top //8e3
const float Hm = 1.2e3; //Mie scattering top //1.3e3

// vec3 bM = vec3(21e-6); //normal mie // vec3(21e-6)
// vec3 bM = vec3(50e-6); //high mie
uniform vec3 bM;

//Rayleigh scattering (sky color, atmospheric up to 8km)
//vec3 bR = vec3(5.8e-6, 13.5e-6, 33.1e-6); //normal earth
//vec3 bR = vec3(5.8e-6, 33.1e-6, 13.5e-6); //purple
//vec3 bR = vec3( 63.5e-6, 13.1e-6, 50.8e-6 ); //green
// vec3 bR = vec3( 13.5e-6, 23.1e-6, 115.8e-6 ); //yellow
// vec3 bR = vec3( 5.5e-6, 15.1e-6, 355.8e-6 ); //yeellow
// vec3 bR = vec3(3.5e-6, 333.1e-6, 235.8e-6 ); //red-purple

 uniform vec3 bR;

// vec3 C = vec3(0., -R0, 0.); //planet center
uniform vec3 C;
vec3 Ds = normalize(vec3(0., 0., -1.)); //sun direction?

#if ORIG_CLOUD == 1
float cloudnear = 1.0; //9e3 12e3  //do not render too close clouds on the zenith
float cloudfar = 1e3; //15e3 17e3
#else
float cloudnear = 1.0; //15e3 17e3
float cloudfar = 70e3; //160e3  //do not render too close clouds on the horizon 160km should be max for cumulus
#endif

//AURORA STUFF
mat2 mm2(in float a) {
    float c = cos(a);
    float s = sin(a);
    return mat2(c, s, -s, c);
}

mat2 m2 = mat2(0.95534, 0.29552, -0.29552, 0.95534);

float tri(in float x) {
    return clamp(abs(fract(x) - .5), 0.01, 0.49);
}

vec2 tri2(in vec2 p) {
    return vec2(tri(p.x) + tri(p.y), tri(p.y + tri(p.x)));
}

float triNoise2d(in vec2 p, float spd) {
    float z = 1.8;
    float z2 = 2.5;
    float rz = 0.;
    p *= mm2(p.x * 0.06);
    vec2 bp = p;
    for(float i = 0.; i < 5.; i++) {
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

float hash21(in vec2 n) {
    return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
}
vec4 aurora(vec3 ro, vec3 rd) {
    vec4 col = vec4(0);
    vec4 avgCol = vec4(0);
    ro *= 1e-5;
    float mt = 10.;
    for(float i = 0.; i < 5.; i++) {
        float of = 0.006 * hash21(gl_FragCoord.xy) * smoothstep(0., 15., i * mt);
        float pt = ((.8 + pow((i * mt), 1.2) * .001) - rd.y) / (rd.y * 2. + 0.4);
        pt -= of;
        vec3 bpos = (ro) + pt * rd;
        vec2 p = bpos.zx;
        //vec2 p = rd.zx;
        float rzt = triNoise2d(p, 0.1);
        vec4 col2 = vec4(0, 0, 0, rzt);
        col2.rgb = (sin(1. - vec3(2.15, -.5, 1.2) + (i * mt) * 0.053) * (0.5 * mt)) * rzt;
        avgCol = mix(avgCol, col2, .5);
        col += avgCol * exp2((-i * mt) * 0.04 - 2.5) * smoothstep(0., 5., i * mt);

    }

    col *= (clamp(rd.y * 15. + .4, 0., 1.2));
    return col * 2.8;
}

//END AURORA STUFF

float noise(in vec2 v) {
    return textureLod(iChannel0, (v + .5) / 256., 0.).r;
}

// by iq
float Noise(in vec3 x) {
    vec3 p = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);

    vec2 uv = (p.xy + vec2(37.0, 17.0) * p.z) + f.xy;
    vec2 rg = texture(iChannel0, (uv + 0.5) / 256.0, -100.0).yx;
    return mix(rg.x, rg.y, f.z);
}

float fnoise(vec3 p, in float t) {
    p *= .25;
    float f;

    f = 0.5000 * Noise(p);
    p = p * 3.02;
    p.y -= t * .1; //speed cloud
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

float cloud(vec3 p, in float t) {
    float cld = fnoise(p * cloudnoise, t) + cloudy * 0.1;
    cld = smoothstep(.4 + .04, .6 + .04, cld);
    cld *= cld * 25.0;
    return cld + haze;
}

void densities(in vec3 pos, out float rayleigh, out float mie) {
    float h = length(pos - C) - R0;
    rayleigh = exp(-h / Hr);
    vec3 d = pos;
    d.y = 0.0;
    float dist = length(d);

    float cld = 0.;
    if(mincloudheight < h && h < maxcloudheight) {
		cld = cloud(pos+vec3(iTime*1e3,0., iTime*1e3),iTime)*cloudy;
        cld = cloud(pos + vec3(xaxiscloud, yaxiscloud, zaxiscloud), iTime) * cloudy; //direction and speed the cloud movers
        cld *= sin(3.1415 * (h - mincloudheight) / mincloudheight) * cloudy;
    }

    #if ORIG_CLOUD
    if(dist < cloudfar) {
        float factor = clamp(1.0 - ((cloudfar - dist) / (cloudfar - cloudnear)), 0.0, 1.0);
        cld *= factor;
    }
    #else

    if(dist > cloudfar) {

        float factor = clamp(1.0 - ((dist - cloudfar) / (cloudfar - cloudnear)), 0.0, 1.0);
        cld *= factor;
    }
    #endif

    mie = exp(-h / Hm) + cld + haze;

}

float escape(in vec3 p, in vec3 d, in float R) {
    vec3 v = p - C;
    float b = dot(v, d);
    float c = dot(v, v) - R * R;
    float det2 = b * b - c;
    if(det2 < 0.)
        return -1.;
    float det = sqrt(det2);
    float t1 = -b - det, t2 = -b + det;
    return (t1 >= 0.) ? t1 : t2;
}

void scatter(vec3 o, vec3 d, out vec3 col, out vec3 scat) {

    float L = escape(o, d, Ra);
    float mu = dot(d, Ds);
    float opmu2 = 1.+ mu * mu;

    float phaseR = phaseR_c * opmu2;
    float phaseM = phaseM_c * (1. - g2) * opmu2 / ((2. + g2) * pow(1. + g2 - 2. * g * mu, 1.5));
    float phaseS = phaseS_c * (1. - s2) * opmu2 / ((2. + s2) * pow(1. + s2 - 2. * s * mu, 1.5));

    float depthR = 0., depthM = 0.;
    vec3 R = vec3(0.), M = vec3(0.);

    float dl = L / float(steps);
    for(int i = 0; i < steps; ++i) {
        float l = float(i) * dl;
        vec3 p = (o + d * l);

        float dR, dM;
        densities(p, dR, dM);
        dR *= dl;
        dM *= dl;
        depthR += dR;
        depthM += dM;

        float Ls = escape(p, Ds, Ra);
        if(Ls > 0.) {
            float dls = Ls / float(stepss);
            float depthRs = 0., depthMs = 0.;
            for(int j = 0; j < stepss; ++j) {
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
        } else {
        }
    }

	//col = (I) * (R * bR * phaseR + M * bM * (phaseM ));
    col = (I) * (M * bR * (phaseM)); // Mie scattering
    col += (SI) * (M * bM * phaseS); //Sun
    col += (I) * (R * bR * phaseR); //Rayleigh scattering
    
    scat = 0.1 * (bM * depthM);
    //scat = 0.0f + clamp(depthM*5e-7,0.,1.); 
}

vec3 hash33(vec3 p) {
    p = fract(p * vec3(443.8975, 397.2973, 491.1871));
    p += dot(p.zxy, p.yxz + 19.27);
    return fract(vec3(p.x * p.y, p.z * p.x, p.y * p.z));
}

vec3 stars(in vec3 p) {
    vec3 c = vec3(0.);
    float res = iResolution.x * 2.5;

    for(float i = 0.; i < 4.; i++) {
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

//SIMPLE SUN STUFF
const float PI = 3.14159265358979323846;
const float density = 0.5;
const float zenithOffset = 0.48;
const vec3 skyColor = vec3(0.37, 0.55, 1.0) * (1.0 + 0.0);

#define zenithDensity(x) density / pow(max(x - zenithOffset, 0.0035), 0.75)

float getSunPoint(vec2 p, vec2 lp) {
    return smoothstep(0.04 * (fov / 2.0), 0.026 * (fov / 2.0), distance(p, lp)) * 50.0;
}

float getMie(vec2 p, vec2 lp) {
    float mytest = lp.y < 0.5 ? (lp.y + 0.5) * pow(0.05, 20.0) : 0.05;
    float disk = clamp(1.0 - pow(distance(p, lp), mytest), 0.0, 1.0);
    return disk * disk * (3.0 - 2.0 * disk) * 0.25 * PI;
}

vec3 getSkyAbsorption(vec3 x, float y) {
    vec3 absorption = x * y;
    absorption = pow(absorption, 1.0 - (y + absorption) * 0.5) / x / y;
    return absorption;
}

vec3 jodieReinhardTonemap(vec3 c) {
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    vec3 tc = c / (c + 1.0);
    return mix(c / (l + 1.0), tc, tc);
}

vec3 getAtmosphericScattering(vec2 p, vec2 lp) {
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
//END SIMPLE SUN STUFF


//FOG

vec3 rotate(vec3 r, float v){ return vec3(r.x*cos(v)+r.z*sin(v),r.y,r.z*cos(v)-r.x*sin(v));}

float noise( in vec3 x )
{
	float  z = x.z*64.0;
	vec2 offz = vec2(0.317,0.123);
	vec2 uv1 = x.xy + offz*floor(z); 
	vec2 uv2 = uv1  + offz;
	return mix(textureLod( iChannel0, uv1 ,0.0).x,textureLod( iChannel0, uv2 ,0.0).x,fract(z))-0.5;
}

float noises( in vec3 p){
	float a = 0.0;
	for(float i=1.0;i<6.0;i++){
		a += noise(p)/i;
		p = p*2.0 + vec3(0.0,a*0.001/i,a*0.0001/i);
	}
	return a;
}

float base( in vec3 p){
	return noise(p*0.00002)*1200.0;
}

float ground( in vec3 p){
	return base(p)+noises(p.zxy*0.00005+10.0)*40.0*(0.0-p.y*0.01)+p.y;
}

float clouds( in vec3 p){
	float b = base(p);
	p.y += b*0.5/abs(p.y) + 100.0;
	return noises(vec3(p.x*0.3+((iTime+iMouse.y)*30.0),p.y,p.z)*0.00002)-max(p.y,0.0)*0.00009;
}

//END FOG

uniform float t_val_1;
uniform float t_val_2;
#ifdef shadertoy
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    float AR = iResolution.x / iResolution.y;

    vec2 sunPos = (iMouse.xy / iResolution.xy);
    sunPos.x *= AR;

    vec2 uv0 = (fragCoord.xy / iResolution.xy);
	//uv0.x *= AR;

    vec2 uv = uv0 * (2.0) - (1.0);
    uv.x *= AR;

#else
void main() {
    float AR = iResolution.x / iResolution.y;
    vec2 uv = vec2(2.0 * vUV.x - 1.0, vUV.y* 2.0 - 1.0);

    vec2 sunPos = vec2((0.7 - (0.05 * fov)), (1.0 - (0.05 * fov)));

    uv.x *= AR;
#endif
    
    float gradSun = mod(elapsed*0.001 + (d_startDay*0.01) * tday,tday)/tday * 2.0 * PI;
    sunPos = vec2(0.9-0.3*cos(gradSun),
                   0.5+0.4*sin(gradSun));

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

    if(D.y < -ts) {
        float L = -O.y / D.y;
        O = O + D * L;
        D.y = -D.y;
        D = normalize(D + vec3(0, .003 * sin(iTime + 6.2831 * noise(O.xz + vec2(0., -iTime * 1e3))), 0.));
        att = .6;
        star = stars(D);
        sunPos.y < 0.5 ? aur = smoothstep(0.0, 2.5, aurora(O, D)) : aur = aur;
    } else {
        float L1 = O.y / D.y;
        vec3 O1 = O + D * L1;

        vec3 D1 = vec3(1.);
        D1 = normalize(D + vec3(1., 0.0009 * sin(iTime + 6.2831 * noise(O1.xz + vec2(0., iTime * 0.8))), 0.));
        star = stars(D1);
        sunPos.y < 0.5 ? aur = smoothstep(0., 1.5, aurora(O, D)) * fade : aur = aur;
    }

    star *= att;
    star *= staratt;

    scatter(O, D, color, scat);
    
    color *= att;
    scat *= att;
    scat *= scatatt;

	//draw the badly implemented sun
    if(extend_sun == 1){
        // vec2 uv1 = (fragCoord.xy / iResolution.xy);
        vec2 uv1 = vUV;
        uv1.x *= AR;

        vec3 sun2 = getAtmosphericScattering(uv1, vec2(sunPos.x, sunPos.y));
        color += sun2;
    }

    color += scat;
    color += star;
    color=color*(1.-(aur.a)*scatatt) + (aur.rgb*scatatt);
    color += aur.rgb * scatatt;

if(false){
//________________________________________________________________
    // time        = iTime*5.0+floor(iTime*0.1)*150.0;
    // vec2 uv     = fragCoord.xy/(iResolution.xx*0.5)-vec2(1.0,iResolution.y/iResolution.x);
    vec3 campos   = vec3(30.0,500.0,iTime*8.0);
		 campos.y = 1500.0-base(campos);
    vec3 ray   = rotate(normalize(vec3(uv.x,uv.y-0.1,1.0).xyz),iMouse.x*0.09);
    vec3 pos    = campos+ray;
    vec3 sun    = vec3(0.0,0.6,-0.4);    	
	
    // raymarch
    float test  = 0.0;
    float fog   = 0.0;
	float dist  = 0.0;

	vec3  p1 = pos;	
	for(float i=1.0;i<50.0;i++){
        test  = ground(p1); 
		fog  += max(test*clouds(p1),fog*0.02);
		p1   += ray*min(test,i*i*0.5);
		dist += test;
		if(abs(test)<10.0||dist>40000.0) break;
	}

	float l     = sin(dot(ray,sun));
	vec3  light = vec3(l,0.0,-l)+ray.y*0.2;
    
	float amb = smoothstep(-100.0,100.0,ground(p1+vec3(0.0,30.0,0.0)+sun*10.0))-smoothstep(1000.0,-0.0,p1.y)*0.7;
	vec3  ground = vec3(0.30,0.30,0.25)+sin(p1*0.001)*0.01+noise(vec3(p1*0.002))*0.1+amb*0.7+light*0.01;
		
	float f = smoothstep(0.0,800.0,fog);
	vec3  cloud = vec3(0.70,0.72,0.70);//+light*0.05+sin(fog*0.0002)*0.2+noise(p1)*0.05;

	float h = smoothstep(10000.,40000.0,dist);
	vec3  sky = cloud+ray.y*0.1-0.02;	
	
    vec3 layer_1 = vec4(pow(color, vec3(1.0 / 2.2)), 1.).xyz; //gamma correct

	// gl_FragColor = vec4(sqrt(smoothstep(0.2,1.0,mix(mix(layer_1,sky,h),cloud,f)-dot(uv,uv)*0.1)),1.0);

    // gl_FragColor = vec4(sqrt(smoothstep(t_val_1,t_val_2,mix(layer_1,sky,sky))),1.0);
    gl_FragColor = vec4(layer_1.xyz,1.0);
}else{
    gl_FragColor = vec4(pow(color, vec3(1.0 / 2.2)), 1.); //gamma correct
}
//________________________________________________________________

//float env = pow( smoothstep(.5, iResolution.x / iResolution.y, length(uv*0.8)), 0.0);
#ifdef shadertoy
    fragColor = vec4(pow(color, vec3(1.0 / 2.2)), 1.); //gamma correct
#else
    // gl_FragColor = vec4(pow(color, vec3(1.0 / 2.2)), 1.); //gamma correct
#endif
}