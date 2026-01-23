
        console.log("JAVA Szimuláció (Interaktív)");
        process.stdout.write("Enter your name: ");
        process.stdin.on('data', data => {
            const name = data.toString().trim();
            console.log("Hello, " + name + "! (Szimulált válasz)");
            process.exit(0);
        });
    