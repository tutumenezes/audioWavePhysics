/*
Author: https://github.com/tutumenezes
Based on https://github.com/cwilso/PitchDetect
*/

window.AudioContext = window.AudioContext || window.webkitAudioContext;

var audioContext = null;
var isPlayingLive = false;
var isPlayingOsc = false;
var howto = false;
var sourceNode = null;
var analyser = null;
var theBuffer = null;
var canvas = null;
var mediaStreamSource = null;
var detectorElem,
	bodyElem, 
	howtoElem,
	waveCanvasContext,
	pitchElem,
	wavelenghtElem,
	periodElem,
	noteElem;

	// How to
	
	
	function howTo() {
		

	 	if(howto) {
	 		howtoElem.className = ' ';
	 		howto = false;
	 	} else {
	 		howtoElem.className = 'visible';
	 		howto = true;
	 	}
	 }



window.onload = function() {
	audioContext = new AudioContext();
	MAX_SIZE = Math.max(4,Math.floor(audioContext.sampleRate/5000));	// corresponds to a 5kHz signal
	
	detectorElem = document.getElementById( "detector" );
	canvas = document.getElementById( "waveform" );
	if (canvas) {
		waveCanvasContext = canvas.getContext("2d");
		waveCanvasContext.strokeStyle = "black";
		waveCanvasContext.lineWidth = 1;
	}
	
	bodyElem = document.body;
	pitchElem = document.getElementById( "pitch" );
	noteElem = document.getElementById( "note" );
	wavelenghtElem = document.getElementById( "wavelenght" );
	periodElem = document.getElementById( "period" );
	howtoElem = document.getElementById( "howto_explanation" );

	detectorElem.ondragenter = function () { 
		this.classList.add("droptarget"); 
		return false; };
	detectorElem.ondragleave = function () { this.classList.remove("droptarget"); return false; };
	detectorElem.ondrop = function (e) {
  		this.classList.remove("droptarget");
  		e.preventDefault();
		theBuffer = null;

	  	var reader = new FileReader();
	  	reader.onload = function (event) {
	  		audioContext.decodeAudioData( event.target.result, function(buffer) {
	    		theBuffer = buffer;
	  		}, function(){alert("error loading!");} ); 

	  	};
	  	reader.onerror = function (event) {
	  		alert("Error: " + reader.error );
		};
	  	reader.readAsArrayBuffer(e.dataTransfer.files[0]);
	  	return false;
	};
}

function error() {
    alert('Stream generation failed.');
}

function getUserMedia(dictionary, callback) {
    try {
        navigator.getUserMedia = 
        	navigator.getUserMedia ||
        	navigator.webkitGetUserMedia ||
        	navigator.mozGetUserMedia;
        navigator.getUserMedia(dictionary, callback, error);
    } catch (e) {
        alert('getUserMedia threw exception :' + e);
    }
}

function gotStream(stream) {
    // Create an AudioNode from the stream.
    mediaStreamSource = audioContext.createMediaStreamSource(stream);

    // Connect it to the destination.
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    mediaStreamSource.connect( analyser );
    updatePitch();
}


function getOscilatorFrequencyFromTable(oscilatorNote) {

	switch(oscilatorNote) {
  		case "C":
    		return "261.625519";
    		console.log(oscilatorNote);
	    break;

	    case "C#":
    		return "277.182648";
	    break;
	    case "D":
    		return "293.664734";
	    break;
	    case "D#":
    		return "311.126984";
	    break;
	    case "E":
    		return "329.627533";
	    break;
	    case "F":
    		return "349.228241";
	    break;
	    case "F#":
    		return "369.994385";
	    break;
	    case "G":
    		return "391.995392";
	    break;
	    case "G#":
    		return "415.304688";
	    break;
	    case "A":
    		return "440";
	    break;
	    case "A#":
    		return "466.163788";
	    break;
	    case "B":
    		return "493.883301";
	    break;
	  
	  default:
	    return "440";
	}

}


function toggleOscillator(oscilatorNote) {
    
    if (isPlayingLive) {
        //stop playing and return
        sourceNode.stop( 0 );
        sourceNode = null;
        analyser = null;
        isPlayingLive = false;
		if (!window.cancelAnimationFrame)
			window.cancelAnimationFrame = window.webkitCancelAnimationFrame;
        window.cancelAnimationFrame( rafID );
        return "play oscillator";
    }
    if (isPlayingOsc) {
    	sourceNode.stop( 0 );
    	sourceNode = null;
        analyser = null;
    }
    sourceNode = audioContext.createOscillator();

    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    sourceNode.connect( analyser );
    analyser.connect( audioContext.destination );

    var SourceOscilatorNote = getOscilatorFrequencyFromTable(oscilatorNote);
    sourceNode.frequency.setValueAtTime(SourceOscilatorNote, audioContext.currentTime);
   
    sourceNode.start(0);
    isPlayingOsc = true;
    isLiveInput = false;
    updatePitch();

    return "stop";
}

function toggleLiveInput() {
    if (isPlayingOsc) {
        //stop playing and return
        sourceNode.stop( 0 );
        sourceNode = null;
        analyser = null;
        isPlayingOsc = false;
		if (!window.cancelAnimationFrame)
			window.cancelAnimationFrame = window.webkitCancelAnimationFrame;
        window.cancelAnimationFrame( rafID );
    }

    if(isPlayingLive) {
    	sourceNode.stop( 0 );
        sourceNode = null;
        analyser = null;
        if (!window.cancelAnimationFrame)
			window.cancelAnimationFrame = window.webkitCancelAnimationFrame;
        window.cancelAnimationFrame( rafID );
		isPlayingLive = false;    	
    }

    getUserMedia(
    	{
            "audio": {
                "mandatory": {
                    "googEchoCancellation": "false",
                    "googAutoGainControl": "false",
                    "googNoiseSuppression": "false",
                    "googHighpassFilter": "false"
                },
                "optional": []
            },
        }, gotStream);
    
}


var rafID = null;
var tracks = null;
var buflen = 2048;
var buf = new Float32Array( buflen );

var noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function noteFromPitch( frequency ) {
	var noteNum = 12 * (Math.log( frequency / 440 )/Math.log(2) );
	return Math.round( noteNum ) + 69;
}

function wavelenghtFromFreq( frequency ) {
	var c = 343; // velocidade de propagação de audio no ar
	var wavelenght = c / frequency;
	return wavelenght;
}

function periodFromFreq( frequency ) {
	var period = 1 / frequency;
	return period;
}

function frequencyFromNoteNumber( note ) {
	return 440 * Math.pow(2,(note-69)/12);
}

//compara as frequências base com a captada no mic

function autoCorrelate( buf, sampleRate ) {
	// Implements the ACF2+ algorithm
	var SIZE = buf.length;
	var rms = 0;

	for (var i=0;i<SIZE;i++) {
		var val = buf[i];
		rms += val*val;
	}
	rms = Math.sqrt(rms/SIZE);
	if (rms<0.01) // not enough signal
		return -1;

	var r1=0, r2=SIZE-1, thres=0.2;
	for (var i=0; i<SIZE/2; i++)
		if (Math.abs(buf[i])<thres) { r1=i; break; }
	for (var i=1; i<SIZE/2; i++)
		if (Math.abs(buf[SIZE-i])<thres) { r2=SIZE-i; break; }

	buf = buf.slice(r1,r2);
	SIZE = buf.length;

	var c = new Array(SIZE).fill(0);
	for (var i=0; i<SIZE; i++)
		for (var j=0; j<SIZE-i; j++)
			c[i] = c[i] + buf[j]*buf[j+i];

	var d=0; while (c[d]>c[d+1]) d++;
	var maxval=-1, maxpos=-1;
	for (var i=d; i<SIZE; i++) {
		if (c[i] > maxval) {
			maxval = c[i];
			maxpos = i;
		}
	}
	var T0 = maxpos;

	var x1=c[T0-1], x2=c[T0], x3=c[T0+1];
	a = (x1 + x3 - 2*x2)/2;
	b = (x3 - x1)/2;
	if (a) T0 = T0 - b/(2*a);

	return sampleRate/T0;
}

function updatePitch( time ) {
	var cycles = new Array;
	analyser.getFloatTimeDomainData( buf );
	var ac = autoCorrelate( buf, audioContext.sampleRate );

	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	
	// This draws the current waveform, useful for debugging
	if (canvas) {  
		var oldArray = waveCanvasContext.getImageData(0,0,canvas.width,canvas.height);
		//count through only the alpha pixels
		for(var d=3;d<oldArray.data.length;d+=4){
		    //dim it with some feedback, I'm using .9
		    oldArray.data[d] = Math.floor(oldArray.data[d]*.2);
		}
		waveCanvasContext.putImageData(oldArray,0,0);

		waveCanvasContext.strokeStyle = "red";
		waveCanvasContext.beginPath();
		waveCanvasContext.moveTo(0,0);
		waveCanvasContext.lineTo(0,canvas.height);
		waveCanvasContext.moveTo((canvas.width/4),0);
		waveCanvasContext.lineTo((canvas.width/4),canvas.height);
		waveCanvasContext.moveTo((canvas.width/2),0);
		waveCanvasContext.lineTo((canvas.width/2),canvas.height);
		waveCanvasContext.moveTo((canvas.width/1.333),0);
		waveCanvasContext.lineTo((canvas.width/1.333),canvas.height);
		waveCanvasContext.moveTo(canvas.width,0);
		waveCanvasContext.lineTo(canvas.width,canvas.height);
		waveCanvasContext.stroke();
		
		waveCanvasContext.strokeStyle = "white";
		waveCanvasContext.beginPath();
		waveCanvasContext.moveTo(0,buf[0]);
		for (var i=1;i<canvas.width;i++) {
			waveCanvasContext.lineTo(i,(canvas.width/4)+(buf[i]*(canvas.width/4)));
		}
		waveCanvasContext.stroke();
	}

 	if (ac == -1) {
 		bodyElem.className = "vague";
 		detectorElem.className = "vague";
	 	pitchElem.innerText = "--";
		noteElem.innerText = "-";
		wavelenghtElem.innerText = "-";
 	} else {
 		bodyElem.className = "confident";
	 	detectorElem.className = "confident";
	 	pitch = ac;
	 	pitchElem.innerText = Math.round( pitch ) ;
	 	var note =  noteFromPitch( pitch );
	 	var wavelenght = wavelenghtFromFreq(pitch);
		var period = periodFromFreq(pitch);

		noteElem.innerHTML = noteStrings[note%12];
		wavelenghtElem.innerHTML = wavelenght.toFixed(2);
		periodElem.innerHTML = period.toFixed(6);

		// console.log('------------------------');
		// console.log('frequency: '+pitch);
		// console.log('note: '+note);
		// console.log('chord: '+noteStrings[note%12]);
		// console.log('wavelenght: '+wavelenghtFromFreq(pitch));

	}

	if (!window.requestAnimationFrame)
		window.requestAnimationFrame = window.webkitRequestAnimationFrame;
	rafID = window.requestAnimationFrame( updatePitch );
}
