const dgram = require('dgram');
const EventEmitter = require('events');
const server = dgram.createSocket('udp4');
const ee = new EventEmitter();

const interval = 70;			//интервал между командами
const timeout = 1000;			//таймаут ожидания ответа
const check_count = 150; 		//число чеков
const ip_addr = '10.0.6.99'; 	//адрес ВМ8119
const port = 8119;				//порт ВМ8119

const colors = {
    reset: '\033[0m',

    //text color

    black: '\033[30m',
    red: '\033[31m',
    green: '\033[32m',
    yellow: '\033[33m',
    blue: '\033[34m',
    magenta: '\033[35m',
    cyan: '\033[36m',
    white: '\033[37m',

    //background color

    blackBg: '\033[40m',
    redBg: '\033[41m',
    greenBg: '\033[42m',
    yellowBg: '\033[43m',
    blueBg: '\033[44m',
    magentaBg: '\033[45m',
    cyanBg: '\033[46m',
    whiteBg: '\033[47m'
}

console.log(colors.reset);

server.on('listening', () => {
	const address = server.address();
	console.log(`${colors.green}Server listening ${address.address}:${address.port}`);
	console.log(colors.reset);
	console.log(colors.yellow+'**********  START **********');
	recursiveCheck(0);
});
server.on('error', (_err) => {
	setTimeout(function(){
		ee.emit('error', _err);
	}, interval);
});
server.on('message', (_msg, rinfo) => {
	setTimeout(function(){
		ee.emit('message', _msg);
	}, interval);
});
server.bind(port);

function message(msg){
	return new Promise(function(res, rej){
		let flg = true;
		let breakEvents = [];
		const complete = function(msg){
			if(flg){
				flg = false;
				process.nextTick(()=>{res(msg);});
				for(let i = 0; i < breakEvents.length; i++)
					clearTimeout(breakEvents[i]);
				ee.removeAllListeners();
			}
		}
		const uncomplete = function(err){
			if(flg){
				flg = false;
				process.nextTick(()=>{rej(err);});
				for(let i = 0; i < breakEvents.length; i++)
					clearTimeout(breakEvents[i]);
				ee.removeAllListeners();
			}	
		}
		ee.once('error', uncomplete);
		ee.once('message', complete);
		breakEvents.push(setTimeout(uncomplete, timeout, new Error('Timeout!')));
		server.send(Buffer.from(msg, 'hex'), port, ip_addr, (err) => {
			if(err){
				breakEvents.push(setTimeout(uncomplete, interval, err));
			}
		});
	});
}

function recursiveCheck(i){
	i++;
	message('040300').then(function(res){
		console.log(colors.reset+'CHECK OPEN :', res);
		return message('0301CAE0F1F1E8F03A20CAEEF1F2FEEAE5E2E8F720C52EC22E20');
	}).then(function(res){
		console.log(colors.reset+'CHECK SELLR:', res);
		return message('040537343831303035353130313834C1C0C420C3E5ECE0F2EEE3E5ED202020343020E3202020202020202020202020202020204100000001000060E803000000000341000000');
	}).then(function(res){
		console.log(colors.reset+'CHECK POS_1:', res);
		return message('0406');
	}).then(function(res){
		console.log(colors.reset+'CHECK PI   :', res);
		return message('0404006400000000');
	}).then(function(res){
		console.log(colors.reset+'CHECK CLOSE:', res);
		if(i < check_count){
			console.log(colors.yellow+'****************************');
			setTimeout(recursiveCheck, interval, i);
		} else{
			console.log(colors.yellow+'********** FINISH **********');
			console.log(colors.reset);
			server.close();
		}
	}).catch((e)=>{
		console.error(colors.red, e);
		server.close();
	});
}