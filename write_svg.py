content = r'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
  <defs>
    <style>
      .body-fill { fill: #A65EAB; }
      .sucker-fill { fill: #FFF5C2; }
      .spot-fill { fill: #B6E0F1; }
      .blush-fill { fill: #D98880; opacity: 0.4; }
      .outline { fill: none; stroke: #1A1A1A; stroke-width: 8; stroke-linecap: round; stroke-linejoin: round; }
      .eye-white { fill: #FFFFFF; }
      .eye-pupil { fill: #1A1A1A; }
      .mouth { fill: none; stroke: #1A1A1A; stroke-width: 6; stroke-linecap: round; }
      .eyebrow { fill: none; stroke: #1A1A1A; stroke-width: 5; stroke-linecap: round; }
      .question-mark { fill: #1A1A1A; font-family: sans-serif; font-size: 80px; font-weight: bold; }

      @keyframes floatThinking {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-15px); }
      }
      @keyframes questionPop {
        0%, 100% { opacity: 0.7; transform: scale(0.9) rotate(-5deg); }
        50% { opacity: 1; transform: scale(1.1) rotate(5deg) translateY(-5px); }
      }

      .octopus-container { animation: floatThinking 4s ease-in-out infinite; transform-origin: center bottom; }
      .question-mark-anim { animation: questionPop 2s ease-in-out infinite; transform-origin: center; }
    </style>
  </defs>

  <g class="octopus-container">
    <!-- Fill Gap in Middle -->
    <circle class="body-fill" cx="200" cy="280" r="80" />

    <!-- Background Tentacles -->
    <path class="body-fill" d="M120,250 Q80,250 60,300 Q50,330 80,340 Q110,350 120,310 Z" />
    <path class="outline" d="M120,250 Q80,250 60,300 Q50,330 80,340 Q110,350 120,310" />
    <path class="body-fill" d="M280,250 Q320,250 340,300 Q350,330 320,340 Q290,350 280,310 Z" />
    <path class="outline" d="M280,250 Q320,250 340,300 Q350,330 320,340 Q290,350 280,310" />

    <!-- Foreground Tentacles -->
    <path class="body-fill" d="M140,270 Q110,360 160,380 Q180,390 190,360 Z" />
    <path class="outline" d="M140,270 Q110,360 160,380 Q180,390 190,360" />
    <path class="body-fill" d="M260,270 Q290,360 240,380 Q220,390 210,360 Z" />
    <path class="outline" d="M260,270 Q290,360 240,380 Q220,390 210,360" />
    <path class="body-fill" d="M105,210 Q60,210 40,260 Q30,300 70,310 Q100,320 110,280 Z" />
    <path class="outline" d="M105,210 Q60,210 40,260 Q30,300 70,310 Q100,320 110,280" />
    <path class="body-fill" d="M295,210 Q340,210 360,260 Q370,300 330,310 Q300,320 290,280 Z" />
    <path class="outline" d="M295,210 Q340,210 360,260 Q370,300 330,310 Q300,320 290,280" />

    <!-- Head -->
    <path class="body-fill" d="M100,160 C100,60 300,60 300,160 C300,260 250,300 200,300 C150,300 100,260 100,160 Z" />
    <path class="outline" d="M100,160 C100,60 300,60 300,160 C300,260 250,300 200,300 C150,300 100,260 100,160" />

    <!-- Details -->
    <circle class="sucker-fill" cx="50" cy="275" r="5" />
    <circle class="sucker-fill" cx="65" cy="295" r="5" />
    <circle class="sucker-fill" cx="350" cy="275" r="5" />
    <circle class="sucker-fill" cx="335" cy="295" r="5" />
    <circle class="sucker-fill" cx="155" cy="355" r="5" />
    <circle class="sucker-fill" cx="245" cy="355" r="5" />

    <circle class="spot-fill" cx="135" cy="90" r="10" opacity="0.6" />
    <circle class="spot-fill" cx="160" cy="75" r="7" opacity="0.6" />
    <circle class="spot-fill" cx="120" cy="115" r="6" opacity="0.6" />

    <ellipse class="blush-fill" cx="135" cy="190" rx="15" ry="8" />
    <ellipse class="blush-fill" cx="265" cy="190" rx="15" ry="8" />

    <g transform="translate(0, -10)">
      <path class="eyebrow" d="M145,125 Q165,115 185,125" />
      <path class="eyebrow" d="M215,125 Q235,115 255,125" />
      
      <circle class="eye-pupil" cx="165" cy="160" r="30" />
      <circle class="eye-white" cx="155" cy="150" r="10" />
      <circle class="eye-white" cx="175" cy="175" r="5" />
      
      <circle class="eye-pupil" cx="235" cy="160" r="30" />
      <circle class="eye-white" cx="225" cy="150" r="10" />
      <circle class="eye-white" cx="245" cy="175" r="5" />
    </g>

    <path class="mouth" d="M185,210 Q200,205 215,210" />

    <text x="310" y="100" class="question-mark question-mark-anim">?</text>
  </g>
</svg>'''

with open('Poly/Thinking.svg', 'w', encoding='utf-8') as f:
    f.write(content)
