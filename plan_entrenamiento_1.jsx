import { useState } from "react";

const phases = [
  { id:1, name:"FASE 1", sub:"Adaptación + Activar metabolismo", weeks:"Semanas 1–4", color:"#00d4aa", desc:"Aprende los movimientos con técnica perfecta. El cuerpo se despierta tras el parón. Empezamos a quemar grasa con la bici en zona 2. Sin ego con los pesos." },
  { id:2, name:"FASE 2", sub:"Hipertrofia + Quema de grasa activa", weeks:"Semanas 5–8", color:"#f59e0b", desc:"Aquí empieza la recomposición real. Más volumen, más intensidad en bici, circuito metabólico. La barriga empieza a irse y el músculo aparece." },
  { id:3, name:"FASE 3", sub:"Intensificación + Rendimiento Enduro", weeks:"Semanas 9–12", color:"#ef4444", desc:"Máxima intensidad. HIIT de verdad, calistenia avanzada, fondo enduro serio. Al final de esta fase estás listo para cualquier ruta." },
  { id:4, name:"FASE 4+", sub:"Mantenimiento indefinido", weeks:"Semana 13 en adelante", color:"#a855f7", desc:"Plan para siempre. Mantienes la forma, sigues progresando, preparas salidas de enduro reales. Aquí ya eres atleta." },
];

const DAYS = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];
const DAYS_S = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];
const DAY_EMOJI = { Lunes:"🔥", Martes:"🚴", Miércoles:"⚡", Jueves:"🔥", Viernes:"🚴", Sábado:"🏔️", Domingo:"😴" };

const dd = {
  phase1: {
    Lunes: {
      title:"PUSH – Pecho, Hombros, Tríceps", tipo:"💪 Fuerza", duration:"45–55 min",
      warmup:"5 min bici nivel 2 + rotaciones hombros y muñecas",
      exercises:[
        { name:"Fondos en silla/banco (puente paralelas)", sets:"3", reps:"12–15", rest:"75s", note:"Manos atrás en el borde, pies apoyados en el suelo", explain:"Siéntate en el borde de una silla resistente, pon las manos a los lados del culo agarrando el borde. Desliza el culo hacia adelante y baja doblando los codos hasta 90°, luego sube. Es el ejercicio puente para llegar a los fondos en paralelas. Cuando hagas 3×15 sin esfuerzo, pasas a las paralelas.", muscles:"Tríceps · Pecho · Hombro frontal" },
        { name:"Fondos paralelas (máx reps limpias)", sets:"3", reps:"Máx (aunque sean 2–4)", rest:"2 min", note:"Si no llegas a 3, salta arriba y baja en 5 segundos (negativa)", explain:"Agarras las barras paralelas de la power tower, bajas controlando 3 segundos hasta que el hombro quede a la altura de las manos, y subes. Si no puedes subir, salta a la posición de arriba y baja MUY lento. Las bajadas lentas también construyen músculo. En 4 semanas llegarás a 8–10 reps.", muscles:"Pecho · Tríceps · Hombros" },
        { name:"Flexiones normales", sets:"3", reps:"Máx", rest:"60s", note:"Si fallas antes de 5, hazlas con rodillas apoyadas sin problema", explain:"La flexión clásica. Manos a la anchura de los hombros, cuerpo recto, bajas hasta casi tocar el suelo y subes. Con rodillas en el suelo si hace falta: mejor hacerlo bien con rodillas que mal sin ellas.", muscles:"Pecho · Tríceps · Core" },
        { name:"Elevaciones laterales mancuernas", sets:"3", reps:"15", rest:"60s", note:"Empieza con 4–5kg. Sin balancear el cuerpo", explain:"De pie, mancuernas a los lados. Subes los brazos lateralmente hasta la altura del hombro como un pájaro abriendo las alas, y bajas lento. Da anchura a los hombros. En enduro son clave para controlar el manillar en bajadas técnicas.", muscles:"Deltoides lateral" },
        { name:"Extensión tríceps mancuerna overhead", sets:"3", reps:"12", rest:"60s", note:"Un brazo a la vez, 5–6kg. Codo apunta al techo siempre", explain:"De pie, mancuerna en una mano levantada sobre la cabeza. Doblas el codo bajando la mancuerna detrás de la nuca y subes. El codo no se mueve, solo el antebrazo. Tríceps en estiramiento máximo.", muscles:"Tríceps cabeza larga" },
      ],
      cooldown:"Estiramiento pectoral en pared 2 min + hombros cruzados",
      hip_note:"✅ Sin impacto en cadera. Todo tren superior.",
      nutrition:"🥗 Día de fuerza: proteína en la comida post-entreno. Huevos, pollo, atún, legumbres.",
    },
    Martes: {
      title:"ZONA 2 – Quema de grasa + Base enduro", tipo:"🚴 Spinning", duration:"40–45 min",
      warmup:"5 min nivel 1–2 muy suave",
      exercises:[
        { name:"Zona 2 continua nivel 3–4", sets:"—", reps:"30–35 min", rest:"—", note:"Puedes mantener una conversación. Sudas pero no te ahogas", explain:"La zona 2 es el rango mágico para quemar grasa. A este ritmo el cuerpo usa principalmente grasa como combustible. 30 minutos aquí quema más grasa que 15 minutos a tope. El test: si puedes decir una frase entera sin jadear, estás en zona 2.", muscles:"Sistema aeróbico · Quema de grasa · Base cardiovascular" },
        { name:"Cadencia alta nivel 2", sets:"—", reps:"5 min finales", rest:"—", note:"90–100 pedaladas por minuto. Poca resistencia, muchas rpm", explain:"Los últimos 5 minutos bajas la resistencia pero pedaleas muy rápido. Esto entrena el pedaleo circular y eficiente que necesitas en el enduro para no gastar energía de más en las subidas de acceso.", muscles:"Coordinación neuromuscular · Gemelos · Cadera" },
      ],
      cooldown:"5 min nivel 1 + estiramiento cuádriceps y gemelos",
      hip_note:"💡 Sillín alto para reducir flexión de cadera. Si molesta, sube el sillín un poco más.",
      music:"🎵 Para zona 2 va bien algo tranquilo: rap castellano suave, podcast, Nadie Sabe Nada.",
      nutrition:"☕ Ideal en ayunas o con café solo. Maximiza la quema de grasa.",
    },
    Miércoles: {
      title:"PULL – Espalda, Bíceps, Agarre", tipo:"💪 Fuerza", duration:"45–55 min",
      warmup:"Rotaciones de escápulas + colgarse 20s de la barra suave",
      exercises:[
        { name:"Dominadas asistidas con silla", sets:"4", reps:"6–8", rest:"2 min", note:"Un pie en la silla para ayudarte a subir. Baja siempre lento 3s", explain:"Te cuelgas de la barra de dominadas y apoyas un pie en una silla debajo. La silla quita parte del peso. Subes usando la ayuda que necesites pero bajas siempre lento y controlado tú solo. Las bajadas lentas son las que más músculo construyen.", muscles:"Dorsal ancho · Bíceps · Agarre · Romboides" },
        { name:"Remo mancuerna un brazo", sets:"3", reps:"12 c/lado", rest:"75s", note:"8kg, codo bien atrás como si arrancases una motosierra", explain:"Apoyas una rodilla y la mano del mismo lado en una silla. Con el brazo libre coges la mancuerna y tiras del codo hacia arriba y atrás. La espalda no rota. Un lado a la vez para corregir desequilibrios.", muscles:"Dorsal · Trapecio · Bíceps" },
        { name:"Curl bíceps mancuernas alterno", sets:"3", reps:"12", rest:"60s", note:"6–8kg. Codos pegados al cuerpo, sin balanceo", explain:"De pie, una mancuerna en cada mano. Subes una doblando el codo hasta el hombro girando la muñeca hacia arriba al final, bajas lento, y subes la otra. Sin mover el cuerpo para coger impulso.", muscles:"Bíceps · Braquial" },
        { name:"Face pulls toalla en puerta", sets:"3", reps:"15", rest:"60s", note:"Engancha una toalla en el pomo de una puerta. Tira hacia tu cara separando las manos", explain:"Dobla una toalla y ciérrala en la puerta. Agarras los dos extremos a la altura de la cara y tiras hacia ti separando las manos al final como si quisieras tocarte las orejas con los pulgares. Es el mejor ejercicio para proteger los hombros. Clave para el enduro.", muscles:"Deltoides posterior · Manguito rotador · Romboides" },
        { name:"Encogimientos hombros mancuernas", sets:"3", reps:"15", rest:"60s", note:"10kg c/mano. Aguanta 1 segundo arriba apretando", explain:"De pie, mancuernas colgando a los lados. Subes los hombros hacia las orejas como diciendo no sé y bajas lento. Los trapecios son los que te permiten aguantar el peso sobre el manillar hora tras hora.", muscles:"Trapecio superior · Cuello" },
      ],
      cooldown:"Colgarse de la barra 30s pasivo + estiramiento dorsal en suelo",
      hip_note:"✅ Sin impacto cadera. El remo con rodilla apoyada en silla.",
      nutrition:"💪 Segundo día de fuerza. Proteína importante hoy también.",
    },
    Jueves: {
      title:"CIRCUITO METABÓLICO – Quema grasa + músculo", tipo:"🔥 Metabólico", duration:"40–50 min",
      warmup:"5 min bici nivel 2 + movilidad general",
      exercises:[
        { name:"CIRCUITO: 4 rondas. 60s descanso entre rondas", sets:"4 rondas", reps:"Ver ejercicios", rest:"60s entre rondas / 0s entre ejercicios", note:"Haz los 5 ejercicios seguidos sin parar. Luego 60s y repite", explain:"El circuito metabólico es la herramienta más eficaz para quemar grasa y construir músculo a la vez. Al no descansar entre ejercicios el corazón trabaja como en cardio mientras los músculos trabajan como en fuerza. Doble efecto en la misma sesión.", muscles:"Cuerpo completo · Sistema cardiovascular · Quema de grasa" },
        { name:"① Flexiones — 10 reps", sets:"—", reps:"10", rest:"0s", note:"Con rodillas si hace falta. Sin parar", explain:"Primera estación. Flexiones al suelo. Si las haces con rodillas en las primeras semanas está bien, el objetivo es no parar entre ejercicios.", muscles:"Pecho · Tríceps" },
        { name:"② Curl bíceps mancuernas — 12 reps", sets:"—", reps:"12", rest:"0s", note:"6kg. Rápido pero controlado", explain:"Segunda estación. 12 curls alternos. El peso es moderado porque ya vienes fatigado de las flexiones.", muscles:"Bíceps · Antebrazo" },
        { name:"③ Knee raises power tower — 12 reps", sets:"—", reps:"12", rest:"0s", note:"Cuelgas de la barra o usas los apoyabrazos. Rodillas al pecho", explain:"Tercera estación. Te cuelgas de la barra o te apoyas en los codos de la power tower y subes las rodillas al pecho. Sin columpiarte. Core directo.", muscles:"Abdominales · Flexores de cadera · Core" },
        { name:"④ Press de hombros mancuernas — 10 reps", sets:"—", reps:"10", rest:"0s", note:"6–8kg. De pie o sentado", explain:"Cuarta estación. Mancuernas a la altura de los hombros, empujas hacia arriba y bajas. Hombros completos.", muscles:"Deltoides · Tríceps" },
        { name:"⑤ Remo mancuerna bilateral — 12 reps", sets:"—", reps:"12", rest:"60s (fin ronda)", note:"Inclinado hacia adelante, tira los codos hacia atrás", explain:"Quinta y última estación de la ronda. Inclinado con una mancuerna en cada mano, tiras los codos hacia atrás simultáneamente. Espalda completa.", muscles:"Dorsal · Trapecio · Bíceps" },
      ],
      cooldown:"5 min bici nivel 1 + estiramiento completo 5 min",
      hip_note:"✅ Sin sentadillas ni ejercicios de cadera con carga.",
      nutrition:"🔥 Día metabólico: buen desayuno antes. Post-entreno proteína + carbohidrato.",
    },
    Viernes: {
      title:"ZONA 2 LARGA + CORE – Enduro base", tipo:"🚴 Spinning + Core", duration:"50–60 min",
      warmup:"5 min nivel 1",
      exercises:[
        { name:"Zona 2 nivel 3–4", sets:"—", reps:"35 min", rest:"—", note:"Mismo ritmo conversacional del martes. Ya notarás que cuesta menos", explain:"Segunda sesión de zona 2 de la semana. La grasa se quema de forma acumulativa: dos sesiones semanales de zona 2 son mucho más eficaces que una sola larga. Para el enduro esto construye el motor aeróbico base.", muscles:"Sistema aeróbico · Quema de grasa" },
        { name:"Plancha frontal", sets:"3", reps:"20–30s", rest:"45s", note:"Cuerpo recto de cabeza a talones. Sin subir el culo", explain:"Boca abajo apoyado en codos y puntas de pies. Cuerpo recto como una tabla. Aguantas el tiempo sin moverte. Es exactamente la postura que mantienes en la bici en bajadas técnicas de enduro.", muscles:"Core completo · Lumbar · Glúteos" },
        { name:"Plancha lateral", sets:"3", reps:"15–20s c/lado", rest:"45s", note:"Apoyado en codo y pie lateral. Sin dejar caer la cadera", explain:"De lado, apoyado en un codo y el pie. Levantas la cadera del suelo formando una línea recta. Los oblicuos son los que te dan estabilidad lateral en la bici al esquivar obstáculos.", muscles:"Oblicuos · Core lateral" },
        { name:"Superman", sets:"3", reps:"15", rest:"45s", note:"Boca abajo, levantas brazos y piernas a la vez. Aguanta 2s arriba", explain:"Tumbado boca abajo con brazos al frente. Levantas simultáneamente brazos y piernas del suelo. Fortalece la zona lumbar sin cargar la cadera. Esencial para la postura en la bici.", muscles:"Lumbar · Glúteos · Isquios · Trapecios" },
      ],
      cooldown:"Estiramiento completo 8 min. Hoy toca hacerlo bien, mañana es el día gordo.",
      hip_note:"💡 Si la cadera molesta en la bici hoy, reduce a 25 minutos.",
      music:"🎵 Viernes: Marea, Barricada, Los Suaves. Rock castellano para aguantar los 35 minutos.",
    },
    Sábado: {
      title:"GRAN FONDO ENDURO – La sesión de la semana", tipo:"🏔️ Enduro", duration:"60–70 min",
      warmup:"8 min progresivo nivel 1→2→3",
      exercises:[
        { name:"Fondo continuo nivel 4", sets:"—", reps:"40 min", rest:"—", note:"La sesión más importante de la semana. No te la saltes nunca", explain:"40 minutos continuos a nivel 4. Simula la pedaleada de acceso a las bajadas de enduro. En fase 1 puede ser duro llegar al final, pero cada semana irá mejor. Si tienes que bajar a nivel 3 los últimos 10 minutos, hazlo. Lo importante es no parar.", muscles:"Sistema aeróbico completo · Cuádriceps · Isquios · Glúteos" },
        { name:"Sprints de pie nivel 7", sets:"4", reps:"20s", rest:"90s nivel 2", note:"Levanta el culo del sillín. Simula superar un obstáculo o rampa corta", explain:"Después del fondo, 4 sprints de 20 segundos a tope de pie en la bici a nivel 7. Entrena la potencia explosiva que usas para superar raíces, logs o cambios bruscos de ritmo en el trail.", muscles:"Sistema anaeróbico · Glúteos · Cuádriceps · Potencia" },
        { name:"Vuelta a la calma nivel 1", sets:"—", reps:"5 min", rest:"—", note:"Nunca pares de golpe tras un sprint", explain:"5 minutos muy suaves para bajar pulsaciones y eliminar el lactato de las piernas.", muscles:"Recuperación activa" },
      ],
      cooldown:"Estiramiento completo tren inferior 10 min. Cuádriceps, isquios, gemelos, glúteos.",
      hip_note:"💡 Sillín bien alto. Si de pie molesta la cadera, quédate sentado en los sprints.",
      music:"🎵 Sábado épico: Tool, Gojira, Trivium, Parkway Drive. O EWS Highlights en YouTube.",
      nutrition:"🍌 Antes come carbohidratos: plátano, avena, tostadas. Necesitas el glucógeno.",
    },
    Domingo: {
      title:"DESCANSO TOTAL", tipo:"😴 Recuperación", duration:"0 min de ejercicio",
      warmup:"—",
      exercises:[
        { name:"No hagas ejercicio", sets:"—", reps:"—", rest:"—", note:"El músculo crece y la grasa se quema también en el descanso.", explain:"Durante el sueño y el reposo el cuerpo repara las fibras musculares dañadas durante el entreno, las hace más gruesas y fuertes. Sin descanso el plan no funciona. Duerme 7–8 horas mínimo.", muscles:"Recuperación y adaptación muscular" },
        { name:"Movilidad suave opcional (10–15 min)", sets:"—", reps:"10–15 min", rest:"—", note:"Si tienes agujetas: estiramientos suaves, nada más", explain:"Si quieres hacer algo, 10–15 minutos de estiramientos suaves o un paseo. Sin intensidad. No añadas ejercicio extra pensando que progresarás más rápido. El sobreentrenamiento frena el progreso.", muscles:"Movilidad articular · Relajación" },
      ],
      cooldown:"—",
      hip_note:"💡 Hidratación y buena comida hoy.",
      nutrition:"🌙 Domingo: come bien, sin restricciones exageradas. Tu cuerpo lo necesita para el lunes.",
    },
  },
  phase2: {
    Lunes: {
      title:"PUSH HIPERTROFIA – Más carga, más volumen", tipo:"💪 Fuerza", duration:"55–65 min",
      warmup:"5 min bici + activación articular hombros",
      exercises:[
        { name:"Fondos paralelas (ya sin silla)", sets:"4", reps:"8–10", rest:"2 min", note:"Si llegas a 8 reps limpias en las 4 series, añade mochila la siguiente semana", explain:"Para la semana 5 ya deberías poder hacer 8 fondos en paralelas sin ayuda. Si todavía no llegas, combina: las que puedas limpias + negativas hasta completar 8.", muscles:"Pecho · Tríceps · Hombros" },
        { name:"Fondos paralelas lastrados (mochila 5–10kg)", sets:"4", reps:"6–8", rest:"2 min", note:"Cuando hagas 10 reps limpias sin peso, metes la mochila", explain:"Una vez dominas los fondos sin peso, metes una mochila con mancuernas dentro. El músculo necesita más resistencia para seguir creciendo. Esto es la sobrecarga progresiva: la clave de la hipertrofia.", muscles:"Pecho · Tríceps · Hombros" },
        { name:"Press mancuernas suelo", sets:"4", reps:"10", rest:"90s", note:"8–10kg c/brazo. Tumbado, codos a 45°", explain:"Tumbado boca arriba, mancuernas a la altura del pecho con los codos a 45 grados. Empujas hacia arriba y bajas controlado. Como el press de banca pero en el suelo.", muscles:"Pecho · Hombro frontal · Tríceps" },
        { name:"Elevaciones frontales + laterales superset", sets:"3", reps:"10+10", rest:"75s", note:"Sin descanso entre frontales y laterales. 5–6kg", explain:"Superset: 10 elevaciones frontales (brazos al frente) seguidas inmediatamente de 10 elevaciones laterales (brazos a los lados) sin descansar. Hombros destrozados en poco tiempo.", muscles:"Deltoides frontal y lateral completo" },
        { name:"Fondos tríceps en silla cargado", sets:"4", reps:"12", rest:"75s", note:"Con una mancuerna en el regazo para añadir peso", explain:"Los fondos de tríceps en silla de fase 1 pero ahora con una mancuerna apoyada en los muslos. Más resistencia, más estímulo para el tríceps.", muscles:"Tríceps · Hombro frontal" },
      ],
      cooldown:"Estiramiento pecho en pared + hombros cruzados 3 min",
      hip_note:"✅ Todo tren superior. Sin impacto cadera.",
      nutrition:"💪 Objetivo: 160–168g de proteína diaria total (2g × 84kg). Distribuida en todas las comidas.",
    },
    Martes: {
      title:"HIIT BICI – Quema grasa máxima", tipo:"🚴 HIIT", duration:"40–45 min",
      warmup:"5 min nivel 2 progresivo",
      exercises:[
        { name:"Tabata cycling: 20s máx / 10s nivel 1", sets:"8 rondas = 4 min", reps:"×3 bloques", rest:"2 min nivel 1 entre bloques", note:"Nivel 7–8 en los 20s. Todo lo que tengas", explain:"Tabata: el protocolo más eficaz científicamente para quemar grasa. 20 segundos a tope absoluto, 10 segundos casi parado. 8 veces son 4 minutos. Descansas 2 minutos y repites. 3 bloques en total. El efecto postcombustión dura 24–48 horas: sigues quemando grasa después de ducharte.", muscles:"Sistema cardiovascular · Potencia · Quema de grasa prolongada" },
        { name:"Zona 2 recuperación", sets:"—", reps:"10 min", rest:"—", note:"Nivel 2–3 suave para eliminar el lactato", explain:"Después del HIIT, 10 minutos suaves en zona 2. La combinación HIIT + zona 2 en la misma sesión maximiza la pérdida de grasa total.", muscles:"Recuperación activa · Oxidación de grasas" },
      ],
      cooldown:"8 min nivel 1 + estiramiento cuádriceps y gemelos",
      hip_note:"💡 En los sprints tabata, si de pie molesta la cadera, hazlos sentado a nivel 8.",
      music:"🔥 Martes HIIT: Beast Mode Spotify, rap con BPM alto, Recycled J a tope.",
      nutrition:"☕ Ideal en ayunas o solo con café. El HIIT en ayunas maximiza la quema de grasa.",
    },
    Miércoles: {
      title:"PULL HIPERTROFIA – Espalda densa", tipo:"💪 Fuerza", duration:"55–65 min",
      warmup:"Band pull-aparts con toalla × 15 + colgarse 30s",
      exercises:[
        { name:"Dominadas supinas (chin-up)", sets:"4", reps:"6–8", rest:"2 min", note:"Palmas mirando hacia ti. Si no llegas: negativas lentas 5s bajada", explain:"Dominadas con las palmas mirando hacia ti. Este agarre activa mucho más el bíceps. Si no puedes subir, salta a la posición de arriba y baja en 5 segundos.", muscles:"Bíceps · Dorsal · Core" },
        { name:"Dominadas pronas (pull-up)", sets:"4", reps:"6–8", rest:"2 min", note:"Palmas hacia afuera. Objetivo: pecho a la barra", explain:"Las dominadas clásicas. El objetivo es que el pecho llegue a la barra, no solo la barbilla. Activa la espalda baja y media mucho más.", muscles:"Dorsal ancho · Trapecio · Romboides" },
        { name:"Remo Yates mancuerna", sets:"4", reps:"10 c/lado", rest:"90s", note:"10kg, tronco a 45°", explain:"Igual que el remo un brazo pero con el tronco a 45 grados. Esta variación activa más el trapecio medio y los romboides, que dan la espalda gruesa y densa.", muscles:"Trapecio medio · Romboides · Dorsal" },
        { name:"Curl concentración mancuerna", sets:"3", reps:"12 c/brazo", rest:"60s", note:"Sentado, codo apoyado en el interior del muslo", explain:"Sentado en una silla, el codo del brazo que trabaja apoyado en el interior del muslo. Subes lentamente y bajas. Al tener el codo fijo, el bíceps trabaja al 100% sin poder engañar.", muscles:"Bíceps pico" },
        { name:"Shrugs pesados mancuernas", sets:"4", reps:"15", rest:"75s", note:"10kg c/mano. Aguanta 1s arriba", explain:"Encogimientos de hombros con el máximo peso. Los trapecios son los que te permiten aguantar la postura sobre el manillar hora tras hora.", muscles:"Trapecio superior · Cuello" },
      ],
      cooldown:"Colgarse pasivo de la barra 2×30s + estiramiento dorsal en suelo",
      hip_note:"✅ Sin impacto cadera.",
      nutrition:"💪 Proteína post-entreno en la hora siguiente.",
    },
    Jueves: {
      title:"CIRCUITO METABÓLICO AVANZADO", tipo:"🔥 Metabólico", duration:"50–55 min",
      warmup:"5 min bici + movilidad articular",
      exercises:[
        { name:"CIRCUITO: 5 rondas. 45s descanso entre rondas", sets:"5 rondas", reps:"Ver ejercicios", rest:"45s entre rondas / 0s entre ejercicios", note:"Una ronda más que en fase 1 y menos descanso", explain:"El mismo concepto del circuito de fase 1 pero más duro: una ronda más y 15 segundos menos de descanso. Tu cuerpo ya está adaptado y necesita más estímulo.", muscles:"Cuerpo completo · Quema de grasa máxima" },
        { name:"① Flexiones diamante — 10 reps", sets:"—", reps:"10", rest:"0s", note:"Manos juntas formando triángulo. Codos hacia atrás", explain:"Flexiones con las manos juntas formando un triángulo. Los codos van hacia atrás pegados al cuerpo. Aísla el tríceps más que las normales.", muscles:"Tríceps · Pecho central" },
        { name:"② Remo bilateral mancuernas — 12 reps", sets:"—", reps:"12", rest:"0s", note:"Inclinado, dos mancuernas a la vez tirando codos atrás", explain:"Inclinado hacia adelante a 45°, una mancuerna en cada mano. Tiras ambos codos hacia atrás simultáneamente.", muscles:"Dorsal · Trapecio · Bíceps" },
        { name:"③ L-sit rodillas en paralelas — 15s", sets:"—", reps:"15 segundos aguante", rest:"0s", note:"En las barras paralelas, sube las rodillas al pecho y aguanta", explain:"En las barras de la power tower, te subes y doblas las rodillas hacia el pecho aguantando la posición. Core brutal. Si no aguantas 15s, aguanta los que puedas.", muscles:"Core · Flexores de cadera · Hombros · Tríceps" },
        { name:"④ Press Arnold mancuernas — 10 reps", sets:"—", reps:"10", rest:"0s", note:"Palmas hacia ti abajo, giras al subir hasta palmas afuera arriba", explain:"Coges las mancuernas con las palmas mirando hacia ti. Al subir, giras los brazos hacia afuera terminando con palmas al frente. Una rotación completa que trabaja las tres partes del hombro.", muscles:"Deltoides completo" },
        { name:"⑤ Curl martillo — 12 reps", sets:"—", reps:"12", rest:"45s (fin ronda)", note:"Palmas enfrentadas todo el tiempo como sujetando un martillo", explain:"Curl con las palmas mirándose entre sí. Trabaja más el antebrazo, el músculo que más fatigua agarrando el manillar en bajadas largas.", muscles:"Braquiorradial · Bíceps · Antebrazo" },
      ],
      cooldown:"5 min bici nivel 1 + estiramiento completo",
      hip_note:"✅ Circuito sin ejercicios de cadera con carga.",
      nutrition:"🔥 Desayuno fuerte antes, proteína después.",
    },
    Viernes: {
      title:"ZONA 2 + CORE AVANZADO", tipo:"🚴 Spinning + Core", duration:"55–65 min",
      warmup:"5 min nivel 1",
      exercises:[
        { name:"Zona 2 nivel 4", sets:"—", reps:"40 min", rest:"—", note:"5 minutos más que en fase 1. Deberías notarlo más fácil", explain:"40 minutos en zona 2 a nivel 4. Si en fase 1 te costaba aguantar 35 minutos, ahora deberías poder aguantar 40 con más comodidad. Eso es la adaptación aeróbica funcionando.", muscles:"Sistema aeróbico · Quema de grasa" },
        { name:"Dragon flag negativo", sets:"3", reps:"5–6", rest:"90s", note:"Tumbado, agárrate a algo fijo detrás de la cabeza. Sube recto y baja en 5s", explain:"Tumbado en el suelo, agarras las patas de una silla pesada. Subes el cuerpo completamente recto apoyado solo en los hombros, y bajas MUY lento en 5 segundos. Bruce Lee lo hacía. Core absoluto.", muscles:"Core completo · Lumbar · Abdominales" },
        { name:"Plancha con toque de hombro", sets:"3", reps:"10 toques c/lado", rest:"60s", note:"En plancha, levanta una mano y toca el hombro contrario alternando", explain:"Plancha normal pero cada vez que toca levantas una mano para tocar el hombro opuesto. Obliga al core a estabilizarse ante el desequilibrio. Mucho más difícil que la plancha estática.", muscles:"Core · Estabilidad · Oblicuos" },
        { name:"Knee raises colgado — 15 reps", sets:"4", reps:"15", rest:"75s", note:"Colgado de la barra de dominadas, sube las rodillas al pecho", explain:"Colgado de la barra, subes las rodillas al pecho. Sin columpiarte. Más difícil que apoyado en los codos porque tienes que aguantar el agarre.", muscles:"Abdominales · Flexores de cadera · Agarre" },
      ],
      cooldown:"Estiramiento completo 8 min.",
      hip_note:"💡 Dragon flag: lumbar completamente pegada al suelo durante todo el movimiento.",
      music:"🎵 Recycled J, Maka, Canserbero para los 40 minutos de bici.",
    },
    Sábado: {
      title:"GRAN FONDO + PIRÁMIDE ENDURO", tipo:"🏔️ Enduro", duration:"70–80 min",
      warmup:"10 min progresivo nivel 1→2→3→4",
      exercises:[
        { name:"Pirámide nivel 4→5→6→7→6→5→4", sets:"—", reps:"3 min cada nivel = 21 min", rest:"—", note:"Simula una subida larga de trail que va cambiando de pendiente", explain:"Subes la resistencia 3 minutos en cada nivel, llegas al 7 y bajas de vuelta. Simula perfectamente una subida de enduro donde el terreno cambia constantemente.", muscles:"Fuerza aeróbica · Umbral anaeróbico" },
        { name:"Fondo estable nivel 4", sets:"—", reps:"20 min", rest:"—", note:"Después de la pirámide las piernas van cargadas. Aguanta el ritmo", explain:"Después de la pirámide, 20 minutos más a nivel 4 constante. Las piernas ya no están frescas. Aguantar esto es lo que construye el fondo real de enduro.", muscles:"Resistencia muscular · Mentalidad · Aeróbico" },
        { name:"Series de subida de pie nivel 7", sets:"6", reps:"1 min", rest:"90s nivel 2", note:"Levanta el culo del sillín. 2 más que en fase 1", explain:"6 series de 1 minuto de pie en la bici a nivel 7. Simula atacar rampas cortas empinadas en el trail.", muscles:"Glúteos · Cuádriceps · Core · Potencia" },
      ],
      cooldown:"10 min nivel 1 + estiramiento completo tren inferior 10 min",
      hip_note:"💡 El sábado es el día más importante. Si te lo saltas pierdes el 40% del fondo enduro.",
      music:"🎵 Gojira, Tool, Mastodon en el ordenador. O EWS Highlights de YouTube.",
      nutrition:"🍌 Come bien antes: avena + plátano + café. Post: arroz con pollo.",
    },
    Domingo: {
      title:"DESCANSO ACTIVO", tipo:"😴 Recuperación", duration:"20–30 min opcional",
      warmup:"—",
      exercises:[
        { name:"Paseo suave 20–30 min", sets:"—", reps:"20–30 min", rest:"—", note:"Sin intensidad. Al aire libre si puedes", explain:"Un paseo suave activa la circulación y acelera la recuperación muscular sin añadir fatiga. En fase 2 estás metiendo mucha caña entre semana.", muscles:"Recuperación activa · Sistema nervioso" },
        { name:"Movilidad cadera suave", sets:"—", reps:"10 min", rest:"—", note:"YouTube: Hip Mobility for Athletes Athlean-X. Con cuidado del choque", explain:"10 minutos de movilidad suave para la cadera. Nada que fuerce la flexión extrema. Rotaciones suaves, estiramiento figura 4 tumbado.", muscles:"Cadera · Flexores · Movilidad articular" },
      ],
      cooldown:"—",
      hip_note:"⚠️ Movilidad de cadera: solo lo que no duela.",
      nutrition:"🌙 Domingo: come sin restricción. Glucógeno y aminoácidos para la semana siguiente.",
    },
  },
  phase3: {
    Lunes: {
      title:"PUSH MÁXIMA INTENSIDAD", tipo:"💪 Fuerza", duration:"60–70 min",
      warmup:"5 min bici + activación articular completa",
      exercises:[
        { name:"Fondos paralelas lastrados máximo", sets:"5", reps:"6–8", rest:"2.5 min", note:"Mochila con el máximo peso que permita 6 reps limpias", explain:"Ya llevas 8 semanas haciendo fondos. Ahora subes al máximo peso posible. 5 series es mucho volumen. Aquí el pecho y los tríceps crecen de verdad.", muscles:"Pecho · Tríceps · Hombros" },
        { name:"Flexiones archer (un brazo asistido)", sets:"4", reps:"5 c/lado", rest:"2 min", note:"Manos muy separadas. Todo el peso en un brazo, el otro casi estirado de apoyo", explain:"Flexión con las manos muy separadas. Al bajar, el peso cae hacia un lado mientras el otro brazo se estira casi recto de apoyo. Progresión hacia la flexión de un solo brazo.", muscles:"Pecho · Tríceps · Core · Estabilidad" },
        { name:"Press mancuernas explosivo", sets:"4", reps:"8", rest:"90s", note:"Sube la mancuerna lo más rápido posible. Baja en 3 segundos contando", explain:"Press en el suelo pero con control de velocidad: sube explosivo, baja muy lento en 3 segundos. Esta combinación explosivo-excéntrico es la que más hipertrofia genera.", muscles:"Pecho · Hombros · Tríceps · Potencia" },
        { name:"Pike push-ups", sets:"4", reps:"10–12", rest:"75s", note:"Culo muy arriba formando V invertida. Baja la cabeza entre las manos", explain:"Posición de flexión con el culo muy alto formando una V invertida. Bajas la cabeza al suelo doblando los codos. Es casi un press de hombros vertical.", muscles:"Deltoides · Tríceps · Trapecios" },
        { name:"Dips explosivos", sets:"3", reps:"10", rest:"90s", note:"Al subir, hazlo tan rápido que las manos casi despeguen de las barras", explain:"Fondos en paralelas normales pero la subida es explosiva. Desarrolla potencia de empuje transferible al braceo en enduro.", muscles:"Tríceps · Pecho · Potencia explosiva" },
      ],
      cooldown:"Estiramiento completo tren superior 8 min",
      hip_note:"✅ Todo tren superior. Cadera descansa.",
      nutrition:"💪 Fase 3 es la más exigente. Proteína en cada comida. Mínimo 160g diarios.",
    },
    Martes: {
      title:"HIIT MÁXIMO – Race Simulation Enduro", tipo:"🚴 HIIT", duration:"45 min",
      warmup:"5 min progresivo",
      exercises:[
        { name:"Bloque carrera: 2 min nivel 8 de pie / 3 min nivel 3", sets:"5 bloques = 25 min", reps:"—", rest:"—", note:"Simula exactamente una etapa de enduro real", explain:"5 bloques de 5 minutos: 2 minutos a tope de pie en nivel 8 y 3 minutos recuperando en nivel 3. Imita el perfil de energía de una etapa de enduro real: nunca recuperas del todo entre esfuerzos.", muscles:"Sistema cardiovascular completo · Potencia · Resistencia a la fatiga" },
        { name:"Sprint final all-out nivel 9", sets:"1", reps:"90 segundos", rest:"—", note:"Todo lo que te quede. Como el sprint de llegada a meta", explain:"Cuando ya no te queda nada, nivel 9 durante 90 segundos. Esto entrena la capacidad de dar el máximo cuando estás fatigado, exactamente lo que pide el enduro.", muscles:"Potencia máxima anaeróbica" },
      ],
      cooldown:"8 min nivel 1 absoluto. Respira.",
      hip_note:"💡 De pie en nivel 8: si la cadera molesta, hazlo sentado a nivel 9.",
      music:"🔥 Fase 3: Slipknot, Bring Me The Horizon, lo que más te active.",
      nutrition:"☕ En ayunas o con café. En fase 3 el cuerpo ya quema grasa eficientemente incluso en HIIT.",
    },
    Miércoles: {
      title:"PULL MÁXIMA INTENSIDAD", tipo:"💪 Fuerza", duration:"60–70 min",
      warmup:"Colgarse barra 30s + band pull-aparts toalla × 20",
      exercises:[
        { name:"Muscle-up o tirón explosivo máximo", sets:"5", reps:"3–5 o máx intentos", rest:"3 min", note:"Si no sale: tirón explosivo llevando el pecho a la barra + baja controlado", explain:"El muscle-up es pasar de colgado a apoyado encima de la barra en un solo movimiento. Requiere un tirón explosivo brutal. Si no sale limpio, practica el tirón (llevar el pecho a la barra tan fuerte como puedas) y la bajada controlada por separado.", muscles:"Dorsal · Bíceps · Tríceps · Core · Coordinación total" },
        { name:"Dominadas lastradas", sets:"4", reps:"5–6", rest:"2.5 min", note:"Mochila con 10–15kg", explain:"Dominadas pronas con mochila cargada. Después de 8 semanas de entreno de espalda deberías poder mover 10-15kg adicionales.", muscles:"Dorsal · Trapecio · Bíceps · Agarre" },
        { name:"Remo mancuerna explosivo", sets:"4", reps:"8 c/lado", rest:"2 min", note:"10kg. Tirón rápido y explosivo. Bajada lenta 2s", explain:"Remo un brazo con 10kg pero el tirón es explosivo: tiras del codo hacia arriba lo más rápido posible. La bajada sigue siendo controlada.", muscles:"Dorsal · Trapecio · Bíceps" },
        { name:"Curl 21s", sets:"3", reps:"21 (7+7+7)", rest:"75s", note:"7 reps rango bajo + 7 rango alto + 7 completo. Sin parar", explain:"Con mancuernas: 7 reps solo de la mitad hacia abajo, 7 solo de la mitad hacia arriba, y 7 completas. Sin parar entre los tres bloques. El bíceps queda sin sangre.", muscles:"Bíceps completo en todos los ángulos" },
      ],
      cooldown:"Colgarse pasivo barra 2×30s + estiramiento dorsal completo",
      hip_note:"✅ Tren superior puro.",
      nutrition:"💪 Post-entreno en la primera hora.",
    },
    Jueves: {
      title:"RECUPERACIÓN ACTIVA + MOVILIDAD", tipo:"🧘 Recovery", duration:"30–40 min",
      warmup:"—",
      exercises:[
        { name:"Spinning suave nivel 2", sets:"—", reps:"20 min", rest:"—", note:"Muy suave. Activa la circulación sin añadir fatiga", explain:"20 minutos en la bici a nivel 2. No es entrenamiento, es recuperación activa. Mover suave aumenta el flujo sanguíneo a los músculos dañados de los días anteriores.", muscles:"Recuperación activa · Circulación" },
        { name:"Movilidad cadera y espalda", sets:"—", reps:"15 min", rest:"—", note:"YouTube: Hip Mobility for Athletes Athlean-X. Con cuidado de la cadera derecha", explain:"15 minutos de movilidad suave para cadera y espalda. En fase 3 el cuerpo está muy cargado y este jueves es sagrado. No añadas nada extra.", muscles:"Cadera · Espalda · Flexibilidad" },
      ],
      cooldown:"—",
      hip_note:"⚠️ Jueves de fase 3 es recuperación OBLIGATORIA. Sin negociar.",
      nutrition:"🌙 Jueves: come bien con carbohidratos. Mañana es día duro.",
    },
    Viernes: {
      title:"FULLBODY CALISTENIA AVANZADA", tipo:"💪 Calistenia", duration:"65–70 min",
      warmup:"Movilidad articular completa 10 min",
      exercises:[
        { name:"L-sit completo en paralelas", sets:"5", reps:"20–30s", rest:"90s", note:"Piernas extendidas horizontales. Si no llegas: tuck (rodillas dobladas)", explain:"En las barras de la power tower, subes y extiendes las piernas hacia adelante formando una L perfecta con el cuerpo. Aguantas. Brutal para el core, flexores de cadera y hombros.", muscles:"Core profundo · Flexores de cadera · Hombros · Tríceps" },
        { name:"Muscle-up negativo", sets:"4", reps:"5", rest:"2 min", note:"Salta a la posición de arriba. Baja en 5 segundos controlado", explain:"Salta hasta estar apoyado encima de la barra y baja MUY lento en 5 segundos. Los negativos lentos construyen la fuerza excéntrica necesaria más eficientemente que los intentos normales.", muscles:"Dorsal · Tríceps · Core · Coordinación" },
        { name:"Fondos rusos (Russian dips)", sets:"3", reps:"8", rest:"2 min", note:"En paralelas: baja hasta que los antebrazos toquen las barras, luego extiende codos atrás", explain:"En las barras paralelas haces el fondo normal pero en la parte baja llevas los codos más abajo hasta que los antebrazos apoyan en las barras. Luego extiendes los codos hacia atrás para volver arriba.", muscles:"Tríceps · Hombros · Pecho" },
        { name:"Remo australiano", sets:"4", reps:"15", rest:"75s", note:"Cuelgas debajo de la barra de dominadas con pies en el suelo. Tiras el pecho hacia la barra", explain:"Cuelgas debajo de la barra con el cuerpo inclinado casi horizontal, pies apoyados. Tiras del cuerpo hacia la barra. Remo con peso corporal.", muscles:"Dorsal · Bíceps · Romboides · Agarre" },
        { name:"Curl 21s + Press Arnold superset", sets:"3", reps:"21 + 10", rest:"90s", note:"21s de bíceps seguidos inmediatamente de 10 press Arnold", explain:"El superset más brutal: los 21s de bíceps seguidos inmediatamente sin descanso de 10 press Arnold. Brazos y hombros completamente fundidos.", muscles:"Bíceps completo · Deltoides completo" },
      ],
      cooldown:"15 min stretching completo + respiración diafragmática 5 min",
      hip_note:"✅ Todo tren superior. Cadera en reposo total.",
      nutrition:"💪 Cena buena hoy. Mañana es la sesión más dura de todo el plan.",
    },
    Sábado: {
      title:"THE BEAST SESSION – Test de fondo total", tipo:"🏔️ Enduro", duration:"80–90 min",
      warmup:"10 min progresivo nivel 1→2→3→4",
      exercises:[
        { name:"Fondo nivel 5 constante", sets:"—", reps:"50 min", rest:"—", note:"Compara con tu primer sábado: antes 40 min nivel 4, ahora 50 min nivel 5", explain:"50 minutos continuos a nivel 5. Más duro y más largo que cualquier sesión anterior. Si llegas a los 50 minutos, estás en un nivel de fondo que nunca has tenido.", muscles:"Sistema aeróbico completo · Resistencia total" },
        { name:"Series de subida de pie nivel 8", sets:"8", reps:"90s", rest:"90s nivel 2", note:"8 series. El doble que en fase 1. Aquí se mide todo", explain:"8 series de 90 segundos de pie a nivel 8. Si completas las 8 series, estás listo para cualquier ruta de enduro de la zona.", muscles:"Potencia · Glúteos · Cuádriceps · Mentalidad" },
        { name:"Cooldown activo nivel 1", sets:"—", reps:"10 min", rest:"—", note:"10 min para bajar pulsaciones. Luego estiramiento completo", explain:"10 minutos muy suaves para cerrar la sesión.", muscles:"Recuperación" },
      ],
      cooldown:"15 min estiramiento completo. Lo mereces.",
      hip_note:"💡 Si la cadera protesta en las series de pie, hazlas sentado. El volumen importa más.",
      music:"🏔️ Tool Lateralus, Gojira From Mars to Sirius, Mastodon Crack the Skye. O Best Of EWS 2024.",
      nutrition:"🍌🍌 Hoy comes más. Desayuno grande. Post: arroz + proteína.",
    },
    Domingo: {
      title:"DESCANSO TOTAL 🏆", tipo:"😴 Recuperación", duration:"0 min",
      warmup:"—",
      exercises:[
        { name:"No hagas ejercicio hoy", sets:"—", reps:"—", rest:"—", note:"12 semanas completadas.", explain:"12 semanas de trabajo. Come bien, hidrátate y duerme. El lunes cuando empiece la Fase 4 serás otra persona físicamente.", muscles:"🏆 Recuperación total merecida" },
      ],
      cooldown:"—",
      hip_note:"🏆 Si has llegado aquí cumpliendo el plan, estás en el mejor estado físico de tu vida adulta.",
      nutrition:"🍕 Hoy come lo que quieras. Te lo has ganado.",
    },
  },
  phase4: {
    Lunes: { title:"PUSH PROGRESIÓN INDEFINIDA", tipo:"💪 Fuerza", duration:"55–60 min", warmup:"5 min bici + activación",
      exercises:[
        { name:"Fondos paralelas lastrados — peso máximo", sets:"4", reps:"6–8", rest:"2 min", note:"Cada 2 semanas intenta añadir 2.5kg más a la mochila", explain:"En fase 4 el objetivo es la progresión continua de por vida. Cuando hagas 8 reps limpias en las 4 series, la semana siguiente añades peso. Así el músculo nunca se estanca.", muscles:"Pecho · Tríceps · Hombros" },
        { name:"Flexión un brazo (o archer avanzada)", sets:"4", reps:"5 c/lado", rest:"2 min", note:"Objetivo de fase 4: la flexión completa de un solo brazo", explain:"Si aún no la tienes limpia, sigue quitando apoyo progresivamente. Si ya la tienes, trabaja la calidad: bajada lenta en 4 segundos.", muscles:"Pecho · Tríceps · Core" },
        { name:"Superserie pecho-hombros a elección", sets:"3", reps:"10+10", rest:"90s", note:"Los ejercicios que más te hayan funcionado de las fases anteriores", explain:"Elige dos ejercicios de pecho u hombros y hazlos en superset. Ya tienes experiencia suficiente para personalizar el plan.", muscles:"Pecho · Deltoides" },
      ],
      cooldown:"Estiramiento tren superior",
      hip_note:"✅ Sin impacto cadera.",
      nutrition:"💪 Fase 4: si quieres ganar músculo, ligero superávit calórico. Si quieres perder más grasa, déficit moderado.",
    },
    Martes: { title:"HIIT AVANZADO + ENDURO", tipo:"🚴 HIIT", duration:"50 min", warmup:"5 min progresivo",
      exercises:[
        { name:"Tabata extendido: 30s máx / 10s nivel 1", sets:"6 rondas = 4 min", reps:"×3 bloques", rest:"90s entre bloques", note:"30s en lugar de 20s. Tu cuerpo ya está adaptado al tabata estándar", explain:"La evolución del tabata de fase 2: los intervalos son ahora 30 segundos en lugar de 20. El cuerpo ya está adaptado y necesita más estímulo.", muscles:"Sistema cardiovascular · Potencia · Quema de grasa" },
        { name:"Fondo libre nivel 4", sets:"—", reps:"15 min", rest:"—", note:"Después del HIIT, fondo tranquilo para terminar de quemar", explain:"15 minutos de zona 2-3 después del HIIT para maximizar la quema de grasa total de la sesión.", muscles:"Aeróbico · Recuperación activa" },
      ],
      cooldown:"8 min suave + estiramiento", hip_note:"💡 Ajusta según cómo llegues.",
      music:"🔥 Tus favoritos. Ya sabes lo que te funciona.",
    },
    Miércoles: { title:"PULL PROGRESIÓN INDEFINIDA", tipo:"💪 Fuerza", duration:"55–60 min", warmup:"Colgarse + pull-aparts",
      exercises:[
        { name:"Muscle-up — trabajo de calidad", sets:"5", reps:"3–5 limpios", rest:"3 min", note:"Trabaja calidad y potencia. Muscle-ups explosivos y controlados", explain:"En fase 4 el muscle-up es el ejercicio central del miércoles. El objetivo no es el número sino la calidad: explosivos, controlados, con buen rango.", muscles:"Dorsal · Bíceps · Tríceps · Core" },
        { name:"Dominadas lastradas al máximo", sets:"4", reps:"5", rest:"2.5 min", note:"Máximo peso posible. Progresión cada 2 semanas", explain:"Las dominadas lastradas son el indicador más claro de fuerza de espalda. El objetivo en fase 4 es seguir añadiendo peso cada 2 semanas.", muscles:"Dorsal · Trapecio · Bíceps" },
        { name:"Superserie espalda-bíceps a elección", sets:"3", reps:"10+10", rest:"90s", note:"Los ejercicios que más te gusten", explain:"Elige dos ejercicios de espalda o bíceps. 12 semanas de experiencia para saber qué te funciona mejor.", muscles:"Dorsal · Bíceps · Trapecio" },
      ],
      cooldown:"Colgarse + estiramiento espalda", hip_note:"✅ Tren superior.",
      nutrition:"💪 La nutrición es la que decide si sigues ganando músculo o perdiendo grasa.",
    },
    Jueves: { title:"CIRCUITO METABÓLICO O DESCANSO ACTIVO", tipo:"🔥 Flexible", duration:"0–50 min según energía", warmup:"Según elijas",
      exercises:[
        { name:"Opción A: Circuito metabólico de fase 3", sets:"5 rondas", reps:"Como en fase 3", rest:"45s", note:"Si tienes energía y quieres seguir perdiendo grasa", explain:"Si llegas al jueves bien recuperado, haz el circuito metabólico de fase 3. Si llegas cansado, elige la opción B.", muscles:"Cuerpo completo" },
        { name:"Opción B: Descanso activo + movilidad", sets:"—", reps:"20–30 min", rest:"—", note:"Si llegas cargado. Escucha al cuerpo", explain:"En fase 4 aprendes a escuchar al cuerpo. El jueves es flexible. El sobreentrenamiento es el mayor enemigo del progreso a largo plazo.", muscles:"Recuperación activa" },
      ],
      cooldown:"Según elijas", hip_note:"💡 En fase 4 ya tienes criterio para decidir.",
    },
    Viernes: { title:"ZONA 2 + CORE MANTENIMIENTO", tipo:"🚴 Spinning + Core", duration:"55–65 min", warmup:"5 min nivel 1",
      exercises:[
        { name:"Zona 2 nivel 4–5", sets:"—", reps:"40 min", rest:"—", note:"Lo que en fase 1 era nivel 4 con esfuerzo, ahora es nivel 5 cómodo", explain:"El mejor indicador de tu progreso aeróbico: el nivel al que puedes mantener zona 2 ha subido. Eso es adaptación cardiovascular real.", muscles:"Sistema aeróbico · Quema de grasa" },
        { name:"Core avanzado a elección", sets:"4", reps:"A elección", rest:"75s", note:"L-sit, dragon flag, plancha con variaciones. Lo que más necesites", explain:"En fase 4 el core lo trabajas con los ejercicios que más te hayan gustado o donde más sientas el punto débil.", muscles:"Core completo" },
      ],
      cooldown:"Estiramiento completo", hip_note:"💡 Si algo molesta en la cadera, para y descansa un día más.",
    },
    Sábado: { title:"SALIDA REAL O GRAN FONDO", tipo:"🏔️ Enduro", duration:"Variable", warmup:"10 min progresivo",
      exercises:[
        { name:"Opción A: Salida real en bici de enduro", sets:"—", reps:"Lo que aguantes", rest:"—", note:"Para esto has entrenado. Sal al trail.", explain:"El objetivo de todo el plan era este: poder salir en la bici de enduro sin que el fondo sea el limitante. Todo lo que has construido en la bici spinning se transfiere directamente al trail.", muscles:"Todo. Fondo real en terreno real." },
        { name:"Opción B: Gran fondo spinning 90 min", sets:"—", reps:"90 min", rest:"—", note:"Si no puedes salir: 90 min en la Cecotec con pirámides y sprints", explain:"Los sábados que no puedas salir al monte, 90 minutos en la bici spinning. Mantiene el fondo que has construido.", muscles:"Sistema aeróbico completo" },
      ],
      cooldown:"Estiramiento completo",
      hip_note:"⚠️ En descensos técnicos la cadera puede protestar. Escúchala.",
      music:"🏔️ En la salida real no necesitas música, tienes el trail. Disfrútalo.",
      nutrition:"🍌🍌 Carbohidratos antes, gel o plátano durante si es larga, proteína + carbos después.",
    },
    Domingo: { title:"DESCANSO — SIEMPRE", tipo:"😴 Recuperación", duration:"0 min", warmup:"—",
      exercises:[
        { name:"Descanso total semanal — para siempre", sets:"—", reps:"—", rest:"—", note:"El domingo de descanso es para siempre. No lo negocies nunca.", explain:"No importa cuántas semanas lleves. El descanso semanal es lo que permite que el plan sea sostenible indefinidamente. Sin él, en 6 meses tendrás una lesión.", muscles:"Recuperación · Sostenibilidad a largo plazo" },
      ],
      cooldown:"—", hip_note:"💡 Fase 4 no tiene fin. El domingo de descanso es la única regla inamovible.",
      nutrition:"🌙 Domingo: come sin culpa. Eres un atleta.",
    },
  },
};

const getKey = (id) => ["phase1","phase2","phase3","phase4"][id-1];

const nutricionTips = [
  { icon:"🥩", title:"Proteína diaria", text:"168g mínimo (2g × 84kg). Distribuida en 4–5 comidas. Sin esto el músculo no crece aunque entrenes perfecto." },
  { icon:"🍚", title:"Carbohidratos", text:"No los elimines. Los necesitas para rendir en la bici. Come más carbos los días de spinning y sábado. Menos los días de descanso." },
  { icon:"🥑", title:"Grasas saludables", text:"Aguacate, huevos, aceite de oliva, frutos secos. Son las que quemas en zona 2. No las elimines." },
  { icon:"💧", title:"Hidratación", text:"Mínimo 3 litros diarios. Los días de bici: 500ml antes, 500ml durante, 500ml después." },
  { icon:"😴", title:"Sueño", text:"7–8 horas. El músculo crece mientras duermes. Sin sueño el plan funciona al 50%." },
  { icon:"📉", title:"Déficit calórico", text:"Para perder la grasa abdominal: déficit de 300–400 calorías diarias. No más. Con déficit agresivo pierdes músculo también." },
  { icon:"⏰", title:"Timing post-entreno", text:"Come proteína + carbohidrato en la hora siguiente a entrenar fuerza. Huevos + tostada, atún + arroz, lo que tengas." },
];

const tests = [
  { semana:"Sem 4", test:"¿Cuántas dominadas seguidas sin ayuda?", objetivo:"Mínimo 3 limpias" },
  { semana:"Sem 4", test:"¿Cuánto aguantas en bici nivel 4?", objetivo:"Mínimo 30 min sin parar" },
  { semana:"Sem 8", test:"¿Cuántas dominadas pronas seguidas?", objetivo:"Mínimo 6–8 limpias" },
  { semana:"Sem 8", test:"¿Bici nivel 4 cuánto tiempo?", objetivo:"Mínimo 40 min sin parar" },
  { semana:"Sem 12", test:"¿Dominadas lastradas con 10kg?", objetivo:"Mínimo 5 reps limpias" },
  { semana:"Sem 12", test:"¿Muscle-up limpio?", objetivo:"Al menos 1 o progresión clara" },
  { semana:"Sem 12", test:"Perímetro cintura vs semana 1", objetivo:"Reducción de 4–6cm" },
  { semana:"Ongoing", test:"¿Cuánto aguantas en bici nivel 5?", objetivo:"Objetivo 50 min en sem 12" },
];

export default function App() {
  const [activePhase, setActivePhase] = useState(1);
  const [activeDay, setActiveDay] = useState(0);
  const [expandedEx, setExpandedEx] = useState(null);
  const [tab, setTab] = useState("plan");

  const phase = phases[activePhase - 1];
  const phaseKey = getKey(activePhase);
  const dayName = DAYS[activeDay];
  const day = dd[phaseKey][dayName];
  const col = phase.color;

  return (
    <div style={{ minHeight:"100vh", background:"#090909", color:"#e5e7eb", fontFamily:"'Barlow Condensed','Arial Narrow',sans-serif" }}>

      {/* Header */}
      <div style={{ background:"#111", borderBottom:`2px solid ${col}30`, padding:"14px 18px 10px", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:0, right:0, width:"120px", height:"100%", background:`linear-gradient(135deg, transparent 40%, ${col}10 100%)` }} />
        <div style={{ fontSize:"9px", letterSpacing:"4px", color:"#4b5563", textTransform:"uppercase" }}>Fernando · Enduro MTB + Calistenia · Recomposición corporal</div>
        <div style={{ fontSize:"22px", fontWeight:"900", letterSpacing:"2px", color:"#fff", marginTop:"2px" }}>PLAN DEFINITIVO</div>
        <div style={{ fontSize:"11px", color:"#6b7280", marginTop:"1px" }}>1,80m · 84kg · Cadera protegida · Plan indefinido</div>
      </div>

      {/* Top tabs */}
      <div style={{ display:"flex", background:"#0d0d0d", borderBottom:"1px solid #181818" }}>
        {[["plan","📋 Plan"],["nutricion","🥗 Nutrición"],["test","📊 Tests"]].map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ flex:1, padding:"9px 4px", background:"transparent", border:"none", borderBottom: tab===id ? `2px solid ${col}` : "2px solid transparent", color: tab===id ? col : "#6b7280", cursor:"pointer", fontFamily:"inherit", fontWeight:"700", fontSize:"11px", letterSpacing:"1px" }}>{label}</button>
        ))}
      </div>

      {tab === "nutricion" && (
        <div style={{ padding:"14px" }}>
          <div style={{ fontSize:"9px", letterSpacing:"3px", color:"#4b5563", textTransform:"uppercase", marginBottom:"10px" }}>NUTRICIÓN PARA RECOMPOSICIÓN CORPORAL</div>
          <div style={{ fontSize:"11px", color:"#9ca3af", marginBottom:"12px", lineHeight:"1.65", padding:"10px 12px", background:"#111", borderRadius:"4px", borderLeft:`3px solid ${col}` }}>
            La recomposición (perder grasa + ganar músculo a la vez) es posible cuando vienes de cero entrenamiento. Clave: déficit calórico moderado + proteína alta + entrenamiento de fuerza. Sin los tres juntos no funciona.
          </div>
          {nutricionTips.map((t,i) => (
            <div key={i} style={{ background:"#111", border:"1px solid #181818", borderRadius:"4px", padding:"10px 12px", marginBottom:"6px" }}>
              <div style={{ fontSize:"13px", marginBottom:"3px" }}>{t.icon} <span style={{ fontSize:"12px", fontWeight:"700", color:"#f3f4f6" }}>{t.title}</span></div>
              <div style={{ fontSize:"11px", color:"#9ca3af", lineHeight:"1.6" }}>{t.text}</div>
            </div>
          ))}
        </div>
      )}

      {tab === "test" && (
        <div style={{ padding:"14px" }}>
          <div style={{ fontSize:"9px", letterSpacing:"3px", color:"#4b5563", textTransform:"uppercase", marginBottom:"10px" }}>TESTS DE PROGRESO POR FASE</div>
          <div style={{ fontSize:"11px", color:"#9ca3af", marginBottom:"12px", lineHeight:"1.65", padding:"10px 12px", background:"#111", borderRadius:"4px", borderLeft:`3px solid ${col}` }}>
            Mídete al final de cada fase. Los números no mienten y son los que te mantienen motivado. Anota los resultados en el móvil.
          </div>
          {tests.map((t,i) => (
            <div key={i} style={{ background:"#111", border:"1px solid #181818", borderRadius:"4px", padding:"10px 12px", marginBottom:"6px", display:"flex", gap:"10px", alignItems:"flex-start" }}>
              <div style={{ background:`${col}20`, color:col, padding:"3px 7px", borderRadius:"2px", fontSize:"9px", fontWeight:"700", letterSpacing:"1px", flexShrink:0 }}>{t.semana}</div>
              <div>
                <div style={{ fontSize:"12px", fontWeight:"700", color:"#f3f4f6" }}>{t.test}</div>
                <div style={{ fontSize:"10px", color:col, marginTop:"2px" }}>→ {t.objetivo}</div>
              </div>
            </div>
          ))}
          <div style={{ marginTop:"12px", padding:"10px 12px", background:"#0a0a0a", borderRadius:"4px", border:"1px solid #141414", fontSize:"10px", color:"#4b5563" }}>
            💡 Mídete la cintura cada 4 semanas. Es el indicador más honesto de pérdida de grasa abdominal.
          </div>
        </div>
      )}

      {tab === "plan" && (
        <>
          {/* Phase tabs */}
          <div style={{ display:"flex", borderBottom:"1px solid #181818", overflowX:"auto", scrollbarWidth:"none" }}>
            {phases.map(p => (
              <button key={p.id} onClick={() => { setActivePhase(p.id); setActiveDay(0); setExpandedEx(null); }} style={{ flexShrink:0, padding:"9px 12px", background: activePhase===p.id ? "#141414" : "transparent", border:"none", borderBottom: activePhase===p.id ? `2px solid ${p.color}` : "2px solid transparent", color: activePhase===p.id ? p.color : "#6b7280", cursor:"pointer", fontFamily:"inherit", fontWeight:"900", fontSize:"10px", letterSpacing:"1.5px", textTransform:"uppercase" }}>
                <div>{p.name}</div>
                <div style={{ fontSize:"8px", fontWeight:"400", opacity:0.7 }}>{p.weeks}</div>
              </button>
            ))}
          </div>

          {/* Phase desc */}
          <div style={{ padding:"9px 16px", background:"#0c0c0c", borderBottom:"1px solid #141414", fontSize:"11px", color:"#9ca3af", borderLeft:`3px solid ${col}` }}>{phase.desc}</div>

          {/* Day tabs */}
          <div style={{ display:"flex", background:"#0d0d0d", borderBottom:"1px solid #141414", overflowX:"auto", scrollbarWidth:"none" }}>
            {DAYS.map((d,i) => (
              <button key={d} onClick={() => { setActiveDay(i); setExpandedEx(null); }} style={{ flexShrink:0, padding:"7px 10px", background: activeDay===i ? "#141414" : "transparent", border:"none", borderBottom: activeDay===i ? `2px solid ${col}` : "2px solid transparent", color: activeDay===i ? col : "#6b7280", cursor:"pointer", fontFamily:"inherit", fontWeight: activeDay===i ? "900" : "400", fontSize:"10px", letterSpacing:"1px", textTransform:"uppercase" }}>
                {DAY_EMOJI[d]} {DAYS_S[i]}
              </button>
            ))}
          </div>

          {/* Day content */}
          <div style={{ padding:"12px 12px 40px" }}>

            {/* Day header */}
            <div style={{ background:"#111", border:"1px solid #181818", borderTop:`3px solid ${col}`, borderRadius:"4px", padding:"12px", marginBottom:"8px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:"8px" }}>
                <div>
                  <div style={{ fontSize:"9px", color:"#4b5563", letterSpacing:"3px", textTransform:"uppercase" }}>{dayName} · {phase.name} · {day.tipo}</div>
                  <div style={{ fontSize:"16px", fontWeight:"900", color:"#fff", letterSpacing:"1px", marginTop:"2px" }}>{day.title}</div>
                </div>
                <div style={{ background:`${col}20`, border:`1px solid ${col}40`, color:col, padding:"4px 8px", borderRadius:"2px", fontSize:"10px", fontWeight:"700", letterSpacing:"1px", flexShrink:0 }}>⏱ {day.duration}</div>
              </div>
              {day.warmup && day.warmup !== "—" && (
                <div style={{ marginTop:"8px", padding:"6px 10px", background:"#0a0a0a", borderRadius:"2px", fontSize:"10px", color:"#9ca3af", borderLeft:"2px solid #222" }}>
                  <span style={{ color:"#4b5563", textTransform:"uppercase", letterSpacing:"1px", fontSize:"8px" }}>Calentamiento: </span>{day.warmup}
                </div>
              )}
            </div>

            {/* Exercises */}
            <div style={{ display:"flex", flexDirection:"column", gap:"5px", marginBottom:"8px" }}>
              {day.exercises.map((ex,i) => {
                const k = `${activePhase}-${activeDay}-${i}`;
                const open = expandedEx === k;
                return (
                  <div key={i} style={{ background:"#111", border:`1px solid ${open ? col+"45" : "#181818"}`, borderRadius:"4px", overflow:"hidden", transition:"border-color 0.2s" }}>
                    <div onClick={() => setExpandedEx(open ? null : k)} style={{ padding:"10px 11px", display:"flex", gap:"9px", alignItems:"flex-start", cursor:"pointer" }}>
                      <div style={{ background:`${col}20`, color:col, width:"24px", height:"24px", borderRadius:"2px", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"10px", fontWeight:"900", flexShrink:0 }}>{i+1}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                          <div style={{ fontSize:"12px", fontWeight:"700", color:"#f3f4f6", flex:1 }}>{ex.name}</div>
                          <span style={{ color:col, fontSize:"12px", marginLeft:"6px", flexShrink:0 }}>{open ? "▲" : "▼"}</span>
                        </div>
                        <div style={{ display:"flex", gap:"8px", marginTop:"4px", flexWrap:"wrap" }}>
                          {ex.sets !== "—" && <span style={{ fontSize:"9px", color:col, fontWeight:"700", letterSpacing:"1px" }}>{ex.sets} series</span>}
                          {ex.reps !== "—" && <span style={{ fontSize:"9px", color:"#e5e7eb", letterSpacing:"1px" }}>{ex.reps} reps</span>}
                          {ex.rest !== "—" && <span style={{ fontSize:"9px", color:"#6b7280", letterSpacing:"1px" }}>💤 {ex.rest}</span>}
                        </div>
                        {ex.note && <div style={{ fontSize:"9px", color:"#6b7280", marginTop:"2px", fontStyle:"italic" }}>→ {ex.note}</div>}
                      </div>
                    </div>
                    {open && (
                      <div style={{ padding:"0 11px 11px 44px", borderTop:`1px solid ${col}20`, paddingTop:"9px" }}>
                        <div style={{ fontSize:"11px", color:"#d1d5db", lineHeight:"1.65", marginBottom:"7px" }}>{ex.explain}</div>
                        {ex.muscles && <div style={{ display:"inline-block", background:`${col}15`, border:`1px solid ${col}30`, color:col, padding:"2px 7px", borderRadius:"2px", fontSize:"8px", letterSpacing:"1px", textTransform:"uppercase", fontWeight:"700" }}>💪 {ex.muscles}</div>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Cooldown */}
            {day.cooldown && day.cooldown !== "—" && (
              <div style={{ background:"#0d0d0d", border:"1px solid #181818", borderRadius:"4px", padding:"8px 11px", marginBottom:"5px", fontSize:"10px", color:"#9ca3af", borderLeft:"2px solid #222" }}>
                <span style={{ color:"#4b5563", textTransform:"uppercase", letterSpacing:"1px", fontSize:"8px" }}>Enfriamiento: </span>{day.cooldown}
              </div>
            )}

            {day.hip_note && <div style={{ background:"#080e1a", border:"1px solid #1d3a6a35", borderRadius:"4px", padding:"8px 11px", marginBottom:"5px", fontSize:"10px", color:"#93c5fd" }}>{day.hip_note}</div>}
            {day.music && <div style={{ background:"#0c0a18", border:"1px solid #6d28d930", borderRadius:"4px", padding:"8px 11px", marginBottom:"5px", fontSize:"10px", color:"#c4b5fd" }}>{day.music}</div>}
            {day.nutrition && <div style={{ background:"#080f08", border:"1px solid #14532430", borderRadius:"4px", padding:"8px 11px", marginBottom:"5px", fontSize:"10px", color:"#86efac" }}>{day.nutrition}</div>}

            {/* Progression note */}
            <div style={{ marginTop:"8px", padding:"9px 11px", background:"#080808", borderRadius:"4px", border:"1px solid #121212", fontSize:"9px", color:"#374151" }}>
              <div style={{ color:"#1f2937", textTransform:"uppercase", letterSpacing:"2px", fontSize:"8px", marginBottom:"4px" }}>PROGRESIÓN {phase.name}</div>
              {activePhase===1 && "Sem 1–2: aprende técnica, no el peso. Sem 3: añade 1 serie. Sem 4: sube peso donde llegues a 15 reps fácil."}
              {activePhase===2 && "Sem 5–6: volumen máximo. Sem 7: añade peso en paralelas y dominadas. Sem 8: test de máximas reps."}
              {activePhase===3 && "Sem 9–10: pesos máximos. Sem 11: muscle-up o negativas explosivas. Sem 12: test total del plan."}
              {activePhase===4 && "Fase 4 indefinida: añade peso o reps cada 2 semanas en al menos un ejercicio. Sin progresión = estancamiento."}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
