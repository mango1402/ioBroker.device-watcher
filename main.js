/* jshint -W097 */
/* jshint strict: false */
/* jslint node: true */

'use strict';

const utils = require('@iobroker/adapter-core');
const adapterName = require('./package.json').name.split('.').pop();

// Sentry error reporting, disable when testing code!
const enableSendSentry = true;

class DeviceWatcher extends utils.Adapter {

	constructor(options) {
		super({
			...options,
			name: adapterName,
			useFormatDate: true,
		});

		this.on('ready', this.onReady.bind(this));
		//this.on('stateChange', this.onStateChange.bind(this));
		// this.on('objectChange', this.onObjectChange.bind(this));
		// this.on('message', this.onMessage.bind(this));
		this.on('unload', this.onUnload.bind(this));

		// arrays
		this.offlineDevices = [];
		this.linkQualityDevices = [];
		this.batteryPowered = [];
		this.batteryLowPowered = [];
		this.listAllDevices = [];
		this.blacklistArr = [];
		this.arrDev = [];
		this.adapterSelected = [];

		// counts
		this.offlineDevicesCount = 0;
		this.deviceCounter = 0;
		this.linkQualityCount = 0;
		this.batteryPoweredCount = 0;
		this.lowBatteryPoweredCount = 0;

		this.deviceReachable = '';

		// arrays of supported adapters
		this.arrApart = {
			alexa2: {
				'Selektor': 'alexa2.*.online',
				'adapter': 'alexa2',
				'battery': 'none',
				'reach': '.online',
				'isLowBat': 'none'
			},
			ble: {
				'Selektor': 'ble.*.rssi',
				'adapter': 'ble',
				'battery': '.battery',
				'reach': 'none',
				'isLowBat': 'none'
			},
			deconz: {
				'Selektor': 'deconz.*.reachable',
				'adapter': 'deconz',
				'battery': '.battery',
				'reach': '.reachable',
				'isLowBat': 'none'
			},
			enocean: {
				'Selektor': 'enocean.*.rssi',
				'adapter': 'enocean',
				'battery': '.BS',
				'reach': 'none',
				'isLowBat': 'none'
			},
			esphome: {
				'Selektor': 'esphome.*._online',
				'adapter': 'esphome',
				'battery': 'none',
				'reach': '._online',
				'isLowBat': 'none',
				'id': '.name'
			},
			fritzdect: {
				'Selektor': 'fritzdect.*.present',
				'adapter': 'fritzDect',
				'battery': '.battery',
				'reach': '.present',
				'isLowBat': '.batterylow'
			},
			homematic: {
				'Selektor': 'hm-rpc.*.UNREACH',
				'adapter': 'homematic',
				'rssiState': '.RSSI_DEVICE',
				'battery': '.OPERATING_VOLTAGE',
				'reach': '.UNREACH',
				'isLowBat': '.LOW_BAT',
				'isLowBat2': '.LOWBAT'
			},
			hue: {
				'Selektor': 'hue.*.reachable',
				'adapter': 'hue',
				'battery': '.battery',
				'reach': '.reachable',
				'isLowBat': 'none'
			},
			hueExt: {
				'Selektor': 'hue-extended.*.reachable',
				'adapter': 'hue-extended',
				'battery': '.config.battery',
				'reach': '.reachable',
				'isLowBat': 'none'
			},
			jeelink: {
				'Selektor': 'jeelink.*.lowBatt',
				'adapter': 'jeelink',
				'battery': 'none',
				'reach': 'none',
				'isLowBat': '.lowBatt'
			},
			mihome: {
				'Selektor': 'mihome.*.percent',
				'adapter': 'miHome',
				'battery': '.percent',
				'reach': 'none',
				'isLowBat': 'none'
			},
			mihomeGW: {
				'Selektor': 'mihome.*.connected',
				'adapter': 'miHome',
				'battery': 'none',
				'reach': '.connected',
				'isLowBat': 'none'
			},
			mihomeVacuum: {
				'Selektor': 'mihome-vacuum.*.wifi_signal',
				'adapter': 'mihomeVacuum',
				'rssiState': '.wifi_signal',
				'battery': '.info.battery',
				'battery2': '.control.battary_life',
				'reach': '.connection',
				'isLowBat': 'none'
			},
			nukiExt: {
				'Selektor': 'nuki-extended.*.batteryCritical',
				'adapter': 'nuki-extended',
				'battery': '.batteryCharge',
				'reach': 'none',
				'isLowBat': '.batteryCritical'
			},
			ping: {
				'Selektor': 'ping.*.alive',
				'adapter': 'ping',
				'battery': 'none',
				'reach': '.alive',
				'isLowBat': 'none'
			},
			shelly: {
				'Selektor': 'shelly.*.rssi',
				'adapter': 'shelly',
				'battery': '.sensor.battery',
				'reach': '.online',
				'isLowBat': 'none'
			},
			sonoff: {
				'Selektor': 'sonoff.*.Uptime',
				'adapter': 'sonoff',
				'rssiState': '.Wifi_Signal',
				'battery': '.battery',
				'reach': '.alive',
				'isLowBat': 'none'
			},
			sonos: {
				'Selektor': 'sonos.*.alive',
				'adapter': 'sonos',
				'battery': 'none',
				'reach': '.alive',
				'isLowBat': 'none'
			},
			switchbotBle: {
				'Selektor': 'switchbot-ble.*.rssi',
				'adapter': 'switchbotBle',
				'battery': '.battery',
				'reach': 'none',
				'isLowBat': 'none',
				'id': '.id'
			},
			zigbee: {
				'Selektor': 'zigbee.*.link_quality',
				'adapter': 'zigbee',
				'battery': '.battery',
				'reach': '.available',
				'isLowBat': '.battery_low'
			},
			zwave: {
				'Selektor': 'zwave2.*.ready',
				'adapter': 'zwave',
				'battery': '.Battery.level',
				'reach': '.ready',
				'isLowBat': '.Battery.isLow'
			}
		};
	}

	async onReady() {
		this.log.debug(`Adapter ${adapterName} was started`);

		try {
			await this.main();
			await this.writeDatapoints();
			this.log.debug('all done, exiting');
			this.terminate ? this.terminate('Everything done. Going to terminate till next schedule', 11) : process.exit(0);
		} catch (error) {
			this.errorReporting('[onReady]', error);
			this.terminate ? this.terminate(15) : process.exit(15);
		}
	}


	async main() {
		this.log.debug(`Function started: ${this.main.name}`);

		try {
			this.supAdapter = {
				alexa2: this.config.alexa2Devices,
				ble: this.config.bleDevices,
				deconz: this.config.deconzDevices,
				enocean: this.config.enoceanDevices,
				esphome: this.config.esphomeDevices,
				fritzdect: this.config.fritzdectDevices,
				homematic: this.config.homematicDevices,
				hue: this.config.hueDevices,
				hueExt: this.config.hueExtDevices,
				jeelink: this.config.jeelinkDevices,
				mihome: this.config.mihomeDevices,
				mihomeGW: this.config.mihomeDevices,
				mihomeVacuum: this.config.mihomeVacuumDevices,
				nukiExt: this.config.nukiExtDevices,
				ping: this.config.pingDevices,
				shelly: this.config.shellyDevices,
				sonoff: this.config.sonoffDevices,
				sonos: this.config.sonosDevices,
				switchbotBle: this.config.switchbotBleDevices,
				zigbee: this.config.zigbeeDevices,
				zwave: this.config.zwaveDevices
			};

			for (const [id] of Object.entries(this.arrApart)) {
				if (this.supAdapter[id]) {
					this.arrDev.push(this.arrApart[id]);
					this.adapterSelected.push(await this.capitalize(id));
					this.log.debug(JSON.stringify(this.arrDev));
				}
			}

			//Check if an Adapter is selected.
			if (this.adapterSelected.length >= 1) {
				this.log.info(`Number of selected adapters: ${this.adapterSelected.length}. Loading data from: ${(this.adapterSelected).join(', ')} ...`);
			} else {
				this.log.warn(`No adapter selected. Please check the instance configuration!`);
				return; // cancel run if no adapter is selected
			}

			//create and fill datapoints for each adapter if selected
			try {
				for (const [id] of Object.entries(this.arrApart)) {
					if (this.supAdapter[id]) {

						if (this.config.createOwnFolder) {
							await this.createDPsForEachAdapter(id);
							if (this.config.createHtmlList) await this.createHtmlListDatapoints(id);
							this.log.debug(`Created datapoints for ${await this.capitalize(id)}`);
							await this.createDataForEachAdapter(id);
							this.log.debug(`Created and filled data for each adapter`);
						}
					}
				}
			} catch (error) {
				this.errorReporting('[main - create and fill datapoints for each adapter]', error);
			}

			// creating counts and lists of all selected adapter
			try {
				if (this.config.createHtmlList) await this.createHtmlListDatapoints();
				await this.createDataOfAllAdapter();
				this.log.debug(`Created and filled data for all adapters`);
			} catch (error) {
				this.errorReporting('[main - create data of all adapter]', error);
			}

		} catch (error) {
			this.errorReporting('[main]', error);
		}

		this.log.debug(`Function finished: ${this.main.name}`);
	} //<--End of main function


	/**
	 * @param {string} [sentence] - Word which should be capitalize
	 **/
	async capitalize(sentence) {
		//make the first letter uppercase
		return sentence && sentence[0].toUpperCase() + sentence.slice(1);
	}

	/**
	 * @param {object} [obj] - State of datapoint
	 **/
	async getInitValue(obj) {
		//state can be null or undefinded
		const foreignState = await this.getForeignStateAsync(obj);
		if (foreignState) return foreignState.val;
	}

	/**
	 * @param {object} [obj] - State of own datapoint
	 **/
	async getOwnInitValue(obj) {
		//state can be null or undefinded for own states
		const stateVal = await this.getStateAsync(obj);
		if (stateVal) return stateVal.val;
	}

	//create datapoints for each adapter
	/**
	 * @param {object} [adptName] - Adaptername of devices
	 **/
	async createDPsForEachAdapter(adptName) {

		await this.setObjectNotExistsAsync(`${adptName}`, {
			type: 'channel',
			common: {
				name: adptName,
			},
			native: {},
		});

		await this.setObjectNotExistsAsync(`${adptName}.offlineCount`, {
			'type': 'state',
			'common': {
				'name': {
					'en': 'Number of devices offline',
					'de': 'Anzahl der Geräte offline',
					'ru': 'Количество устройств offline',
					'pt': 'Número de dispositivos offline',
					'nl': 'Nummer van apparatuur offline',
					'fr': 'Nombre de dispositifs hors ligne',
					'it': 'Numero di dispositivi offline',
					'es': 'Número de dispositivos sin conexión',
					'pl': 'Ilość urządzeń offline',
					'zh-cn': '线内装置数量'
				},
				'type': 'number',
				'role': 'value',
				'read': true,
				'write': false,
			},
			'native': {}
		});

		await this.setObjectNotExistsAsync(`${adptName}.offlineList`, {
			'type': 'state',
			'common': {
				'name': {
					'en': 'List of offline devices',
					'de': 'Liste der Offline-Geräte',
					'ru': 'Список оффлайн устройств',
					'pt': 'Lista de dispositivos off-line',
					'nl': 'List van offline apparatuur',
					'fr': 'Liste des dispositifs hors ligne',
					'it': 'Elenco dei dispositivi offline',
					'es': 'Lista de dispositivos sin conexión',
					'pl': 'Lista urządzeń offline',
					'zh-cn': '线装置清单'
				},
				'type': 'array',
				'role': 'json',
				'read': true,
				'write': false,
			},
			'native': {}
		});

		await this.setObjectNotExistsAsync(`${adptName}.listAll`, {
			'type': 'state',
			'common': {
				'name': {
					'en': 'List of all devices',
					'de': 'Liste aller Geräte',
					'ru': 'Список всех устройств',
					'pt': 'Lista de todos os dispositivos',
					'nl': 'List van alle apparaten',
					'fr': 'Liste de tous les dispositifs',
					'it': 'Elenco di tutti i dispositivi',
					'es': 'Lista de todos los dispositivos',
					'pl': 'Lista wszystkich urządzeń',
					'zh-cn': '所有装置清单'
				},
				'type': 'array',
				'role': 'json',
				'read': true,
				'write': false,
			},
			'native': {}
		});

		await this.setObjectNotExistsAsync(`${adptName}.linkQualityList`, {
			'type': 'state',
			'common': {
				'name': {
					'en': 'List of devices with signal strength',
					'de': 'Liste der Geräte mit Signalstärke',
					'ru': 'Список устройств с силой сигнала',
					'pt': 'Lista de dispositivos com força de sinal',
					'nl': 'List van apparaten met signaalkracht',
					'fr': 'Liste des dispositifs avec force de signal',
					'it': 'Elenco dei dispositivi con forza del segnale',
					'es': 'Lista de dispositivos con fuerza de señal',
					'pl': 'Lista urządzeń z siłą sygnałową',
					'zh-cn': '具有信号实力的装置清单'
				},
				'type': 'array',
				'role': 'json',
				'read': true,
				'write': false,
			},
			'native': {}
		});

		await this.setObjectNotExistsAsync(`${adptName}.countAll`, {
			'type': 'state',
			'common': {
				'name': {
					'en': 'Number of all devices',
					'de': 'Anzahl aller Geräte',
					'ru': 'Количество всех устройств',
					'pt': 'Número de todos os dispositivos',
					'nl': 'Nummer van alle apparaten',
					'fr': 'Nombre de tous les appareils',
					'it': 'Numero di tutti i dispositivi',
					'es': 'Número de todos los dispositivos',
					'pl': 'Ilość wszystkich urządzeń',
					'zh-cn': '所有装置的数目'
				},
				'type': 'number',
				'role': 'value',
				'read': true,
				'write': false,
			},
			'native': {}
		});

		await this.setObjectNotExistsAsync(`${adptName}.batteryList`, {
			'type': 'state',
			'common': {
				'name': {
					'en': 'List of devices with battery state',
					'de': 'Liste der Geräte mit Batteriezustand',
					'ru': 'Список устройств с состоянием батареи',
					'pt': 'Lista de dispositivos com estado da bateria',
					'nl': 'List van apparaten met batterij staat',
					'fr': 'Liste des appareils avec état de batterie',
					'it': 'Elenco dei dispositivi con stato della batteria',
					'es': 'Lista de dispositivos con estado de batería',
					'pl': 'Lista urządzeń z baterią stanową',
					'zh-cn': '电池国装置清单'
				},
				'type': 'array',
				'role': 'json',
				'read': true,
				'write': false,
			},
			'native': {}
		});

		await this.setObjectNotExistsAsync(`${adptName}.lowBatteryList`, {
			'type': 'state',
			'common': {
				'name': {
					'en': 'List of devices with low battery state',
					'de': 'Liste der Geräte mit niedrigem Batteriezustand',
					'ru': 'Список устройств с низким состоянием батареи',
					'pt': 'Lista de dispositivos com baixo estado da bateria',
					'nl': 'List van apparaten met lage batterij staat',
					'fr': 'Liste des appareils à faible état de batterie',
					'it': 'Elenco di dispositivi con stato di batteria basso',
					'es': 'Lista de dispositivos con estado de batería bajo',
					'pl': 'Lista urządzeń o niskim stanie baterii',
					'zh-cn': '低电池国家装置清单'
				},
				'type': 'array',
				'role': 'json',
				'read': true,
				'write': false,
			},
			'native': {}
		});

		await this.setObjectNotExistsAsync(`${adptName}.lowBatteryCount`, {
			'type': 'state',
			'common': {
				'name': {
					'en': 'Number of devices with low battery',
					'de': 'Anzahl der Geräte mit niedriger Batterie',
					'ru': 'Количество устройств c низкой батареей',
					'pt': 'Número de dispositivos com bateria baixa',
					'nl': 'Nummer van apparaten met lage batterij',
					'fr': 'Nombre de dispositifs avec batterie basse',
					'it': 'Numero di dispositivi con batteria bassa',
					'es': 'Número de dispositivos con batería baja',
					'pl': 'Liczba urządzeń z niską baterią',
					'zh-cn': '低电池的装置数量'
				},
				'type': 'number',
				'role': 'value',
				'read': true,
				'write': false,
			},
			'native': {}
		});

		await this.setObjectNotExistsAsync(`${adptName}.batteryCount`, {
			'type': 'state',
			'common': {
				'name': {
					'en': 'Number of devices with battery',
					'de': 'Anzahl der Geräte mit Batterie',
					'ru': 'Количество устройств c батареей',
					'pt': 'Número de dispositivos com bateria',
					'nl': 'Nummer van apparaten met batterij',
					'fr': 'Nombre de dispositifs avec batterie',
					'it': 'Numero di dispositivi con batteria',
					'es': 'Número de dispositivos con batería',
					'pl': 'Liczba urządzeń z baterią',
					'zh-cn': '电池的装置数量'
				},
				'type': 'number',
				'role': 'value',
				'read': true,
				'write': false,
			},
			'native': {}
		});
	}

	/**
	 * @param {object} [adptName] - Adaptername of devices
	 **/
	async createHtmlListDatapoints(adptName) {

		let dpSubFolder;
		//write the datapoints in subfolders with the adaptername otherwise write the dP's in the root folder
		if (adptName) {
			dpSubFolder = `${adptName}.`;
		} else {
			dpSubFolder = '';
		}

		await this.setObjectNotExistsAsync(`${dpSubFolder}offlineListHTML`, {
			'type': 'state',
			'common': {
				'name': {
					'en': 'HTML List of offline devices',
					'de': 'HTML Liste der Offline-Geräte',
					'ru': 'HTML Список оффлайн устройств',
					'pt': 'HTML Lista de dispositivos off-line',
					'nl': 'HTML List van offline apparatuur',
					'fr': 'HTML Liste des dispositifs hors ligne',
					'it': 'HTML Elenco dei dispositivi offline',
					'es': 'HTML Lista de dispositivos sin conexión',
					'pl': 'HTML Lista urządzeń offline',
					'zh-cn': 'HTML 线装置清单'
				},
				'type': 'string',
				'role': 'html',
				'read': true,
				'write': false,
			},
			'native': {}
		});

		await this.setObjectNotExistsAsync(`${dpSubFolder}linkQualityListHTML`, {
			'type': 'state',
			'common': {
				'name': {
					'en': 'HTML List of devices with signal strength',
					'de': 'HTML Liste der Geräte mit Signalstärke',
					'ru': 'HTML Список устройств с силой сигнала',
					'pt': 'HTML Lista de dispositivos com força de sinal',
					'nl': 'HTML List van apparaten met signaalkracht',
					'fr': 'HTML Liste des dispositifs avec force de signal',
					'it': 'HTML Elenco dei dispositivi con forza del segnale',
					'es': 'HTML Lista de dispositivos con fuerza de señal',
					'pl': 'HTML Lista urządzeń z siłą sygnałową',
					'zh-cn': 'HTML 具有信号实力的装置清单'
				},
				'type': 'string',
				'role': 'value',
				'read': true,
				'write': false,
			},
			'native': {}
		});

		await this.setObjectNotExistsAsync(`${dpSubFolder}batteryListHTML`, {
			'type': 'state',
			'common': {
				'name': {
					'en': 'HTML List of devices with battery state',
					'de': 'HTML Liste der Geräte mit Batteriezustand',
					'ru': 'HTML Список устройств с состоянием батареи',
					'pt': 'HTML Lista de dispositivos com estado da bateria',
					'nl': 'HTML List van apparaten met batterij staat',
					'fr': 'HTML Liste des appareils avec état de batterie',
					'it': 'HTML Elenco dei dispositivi con stato della batteria',
					'es': 'HTML Lista de dispositivos con estado de batería',
					'pl': 'HTML Lista urządzeń z baterią stanową',
					'zh-cn': 'HTML 电池国装置清单'
				},
				'type': 'string',
				'role': 'html',
				'read': true,
				'write': false,
			},
			'native': {}
		});

		await this.setObjectNotExistsAsync(`${dpSubFolder}lowBatteryListHTML`, {
			'type': 'state',
			'common': {
				'name': {
					'en': 'HTML List of devices with low battery state',
					'de': 'HTML Liste der Geräte mit niedrigem Batteriezustand',
					'ru': 'HTML Список устройств с низким состоянием батареи',
					'pt': 'HTML Lista de dispositivos com baixo estado da bateria',
					'nl': 'HTML List van apparaten met lage batterij staat',
					'fr': 'HTML Liste des appareils à faible état de batterie',
					'it': 'HTML Elenco di dispositivi con stato di batteria basso',
					'es': 'HTML Lista de dispositivos con estado de batería bajo',
					'pl': 'HTML Lista urządzeń o niskim stanie baterii',
					'zh-cn': 'HTML 低电池国家装置清单'
				},
				'type': 'string',
				'role': 'html',
				'read': true,
				'write': false,
			},
			'native': {}
		});
	}

	/**
	 * @param {object} [i] - Device Object
	 **/
	async createData(i) {
		const devices = await this.getForeignStatesAsync(this.arrDev[i].Selektor);
		const deviceAdapterName = await this.capitalize(this.arrDev[i].adapter);
		const myBlacklist = this.config.tableBlacklist;

		/*----------  Loop for blacklist ----------*/
		for (const i in myBlacklist) {
			this.blacklistArr.push(myBlacklist[i].device);
			this.log.debug(`Found items on the blacklist: ${this.blacklistArr}`);
		}

		/*----------  Start of second main loop  ----------*/
		for (const [id] of Object.entries(devices)) {
			if (!this.blacklistArr.includes(id)) {

				const currDeviceString = id.slice(0, (id.lastIndexOf('.') + 1) - 1);
				const shortCurrDeviceString = currDeviceString.slice(0, (currDeviceString.lastIndexOf('.') + 1) - 1);

				//Get device name
				const deviceObject = await this.getForeignObjectAsync(currDeviceString);
				const shortDeviceObject = await this.getForeignObjectAsync(shortCurrDeviceString);
				let deviceName;

				switch (this.arrDev[i].adapter) {
					case 'switchbotBle':	//Get ID for Switchbot and ESPHome Devices
					case 'esphome':
						deviceName = await this.getInitValue(currDeviceString + this.arrDev[i].id);
						break;

					case 'hue-extended':
					case 'mihomeVacuum':
					case 'homematic':
					case 'nuki-extended':
						if (shortDeviceObject && typeof shortDeviceObject === 'object') {
							deviceName = shortDeviceObject.common.name;
						}
						break;

					default:
						if (deviceObject && typeof deviceObject === 'object') {
							deviceName = deviceObject.common.name;
						}
						break;
				}

				const deviceMainSelector = await this.getForeignStateAsync(id);

				// 3. Get battery states
				const deviceBatteryState = await this.getInitValue(currDeviceString + this.arrDev[i].battery);
				const shortDeviceBatteryState = await this.getInitValue(shortCurrDeviceString + this.arrDev[i].battery);
				const shortDeviceBatteryState2 = await this.getInitValue(shortCurrDeviceString + this.arrDev[i].battery2);

				// 1. Get link quality
				let deviceQualityState;
				let linkQuality;

				switch (this.arrDev[i].adapter) {
					case 'sonoff':
					case 'mihomeVacuum':
					case 'homematic':
						deviceQualityState = await this.getForeignStateAsync(currDeviceString + this.arrDev[i].rssiState);
						break;
					default:
						deviceQualityState = await this.getForeignStateAsync(id);
				}

				if ((deviceQualityState) && (typeof deviceQualityState.val === 'number')) {
					if (this.config.trueState) {
						linkQuality = deviceQualityState.val;
					} else {
						if (deviceQualityState.val < 0) {
							linkQuality = Math.min(Math.max(2 * (deviceQualityState.val + 100), 0), 100) + '%';
						} else if ((deviceQualityState.val) >= 0) {
							linkQuality = parseFloat((100 / 255 * deviceQualityState.val).toFixed(0)) + '%';
						}
					}
					if (this.config.listOnlyBattery) {
						if (deviceBatteryState || shortDeviceBatteryState) {
							this.linkQualityDevices.push(
								{
									'Device': deviceName,
									'Adapter': deviceAdapterName,
									'Signal strength': linkQuality
								}
							);
						}
					} else {
						this.linkQualityDevices.push(
							{
								'Device': deviceName,
								'Adapter': deviceAdapterName,
								'Signal strength': linkQuality
							}
						);
					}
				} else {
					// no linkQuality available for powered devices
					linkQuality = ' - ';
				}

				// 1b. Count how many devices with link Quality
				this.linkQualityCount = this.linkQualityDevices.length;

				// 2. When was the last contact to the device?
				let lastContactString;

				let deviceState = 'Online';
				if (deviceMainSelector) {
					try {
						const time = new Date();
						const lastContact = Math.round((time.getTime() - deviceMainSelector.ts) / 1000 / 60);
						const lastStateChange = Math.round((time.getTime() - deviceMainSelector.lc) / 1000 / 60);
						const deviceUnreachState = await this.getInitValue(currDeviceString + this.arrDev[i].reach);

						const getLastContact = async () => {
							lastContactString = this.formatDate(new Date((deviceMainSelector.ts)), 'hh:mm') + ' Uhr';
							if (Math.round(lastContact) > 100) {
								lastContactString = Math.round(lastContact / 60) + ' Stunden';
							}
							if (Math.round(lastContact / 60) > 48) {
								lastContactString = Math.round(lastContact / 60 / 24) + ' Tagen';
							}
							return lastContactString;
						};

						const getLastStateChange = async () => {
							lastContactString = this.formatDate(new Date((deviceMainSelector.lc)), 'hh:mm') + ' Uhr';
							if (Math.round(lastStateChange) > 100) {
								lastContactString = Math.round(lastStateChange / 60) + ' Stunden';
							}
							if (Math.round(lastStateChange / 60) > 48) {
								lastContactString = Math.round(lastStateChange / 60 / 24) + ' Tagen';
							}
							return lastContactString;
						};

						// 2b. wenn seit X Minuten kein Kontakt mehr besteht, nimm Gerät in Liste auf
						//Rechne auf Tage um, wenn mehr als 48 Stunden seit letztem Kontakt vergangen sind
						switch (this.arrDev[i].adapter) {
							case 'ping':
							case 'alexa2':
								//State changed
								if (!deviceUnreachState) {
									await getLastStateChange();
								} else {
									await getLastContact();
								}
								break;

							default:
								await getLastContact();
								break;
						}

						const pushOfflineDevice = async () => {
							if (this.config.listOnlyBattery) {	//if checked, list only battery devices
								if (deviceBatteryState || shortDeviceBatteryState) {
									this.offlineDevices.push(
										{
											'Device': deviceName,
											'Adapter': deviceAdapterName,
											'Last contact': lastContactString
										}
									);
								}
							} else {
								this.offlineDevices.push( 	//else push all devices
									{
										'Device': deviceName,
										'Adapter': deviceAdapterName,
										'Last contact': lastContactString
									}
								);
							}
						};

						switch (this.arrDev[i].adapter) {
							case 'alexa2':
								if (this.config.alexa2MaxMinutes === -1) {
									if (!deviceUnreachState) {
										deviceState = 'Offline'; //set online state to offline
										await pushOfflineDevice();
									}
								} else if ((lastStateChange > this.config.alexa2MaxMinutes) && (!deviceUnreachState)) {
									deviceState = 'Offline'; //set online state to offline
									await pushOfflineDevice();
								}
								break;
							case 'ble':
								if (this.config.bleMaxMinutes === -1) {
									if (!deviceUnreachState) {
										deviceState = 'Offline'; //set online state to offline
										await pushOfflineDevice();
									}
								} else if (lastContact > this.config.bleMaxMinutes) {
									deviceState = 'Offline'; //set online state to offline
									await pushOfflineDevice();
								}
								break;
							case 'deconz':
								if (this.config.deconzMaxMinutes === -1) {
									if (!deviceUnreachState) {
										deviceState = 'Offline'; //set online state to offline
										await pushOfflineDevice();
									}
								} else if (lastContact > this.config.deconzMaxMinutes) {
									deviceState = 'Offline'; //set online state to offline
									await pushOfflineDevice();
								}
								break;
							case 'enocean':
								if (this.config.enoceanMaxMinutes === -1) {
									if (!deviceUnreachState) {
										deviceState = 'Offline'; //set online state to offline
										await pushOfflineDevice();
									}
								} else if (lastContact > this.config.enoceanMaxMinutes) {
									deviceState = 'Offline'; //set online state to offline
									await pushOfflineDevice();
								}
								break;
							case 'esphome':
								if (this.config.esphomeMaxMinutes === -1) {
									if (!deviceUnreachState) {
										deviceState = 'Offline'; //set online state to offline
										await pushOfflineDevice();
									}
								} else if (lastContact > this.config.esphomeMaxMinutes) {
									deviceState = 'Offline'; //set online state to offline
									await pushOfflineDevice();
								}
								break;
							case 'fritzDect':
								if (this.config.fritzdectMaxMinutes === -1) {
									if (!deviceUnreachState) {
										deviceState = 'Offline'; //set online state to offline
										await pushOfflineDevice();
									}
								} else if (lastContact > this.config.fritzdectMaxMinutes) {
									deviceState = 'Offline'; //set online state to offline
									await pushOfflineDevice();
								}
								break;
							case 'homematic':
								if (this.config.homematicMaxMinutes === -1) {
									if (deviceUnreachState) {
										deviceState = 'Offline'; //set online state to offline
										await pushOfflineDevice();
									}
								} else if (lastContact > this.config.homematicMaxMinutes) {
									deviceState = 'Offline'; //set online state to offline
									await pushOfflineDevice();
								}
								break;
							case 'hue':
								if (this.config.hueMaxMinutes === -1) {
									if (!deviceUnreachState) {
										deviceState = 'Offline'; //set online state to offline
										await pushOfflineDevice();
									}
								} else if (lastContact > this.config.hueMaxMinutes) {
									deviceState = 'Offline'; //set online state to offline
									await pushOfflineDevice();
								}
								break;
							case 'hue-extended':
								if (this.config.hueextMaxMinutes === -1) {
									if (!deviceUnreachState) {
										deviceState = 'Offline'; //set online state to offline
										await pushOfflineDevice();
									}
								} else if (lastContact > this.config.hueextMaxMinutes) {
									deviceState = 'Offline'; //set online state to offline
									await pushOfflineDevice();
								}
								break;
							case 'jeelink':
								if (this.config.jeelinkMaxMinutes === -1) {
									if (!deviceUnreachState) {
										deviceState = 'Offline'; //set online state to offline
										await pushOfflineDevice();
									}
								} else if (lastContact > this.config.jeelinkMaxMinutes) {
									deviceState = 'Offline'; //set online state to offline
									await pushOfflineDevice();
								}
								break;
							case 'miHome':
								if (this.config.mihomeMaxMinutes === -1) {
									if (!deviceUnreachState) {
										deviceState = 'Offline'; //set online state to offline
										await pushOfflineDevice();
									}
								} else if (lastContact > this.config.mihomeMaxMinutes) {
									deviceState = 'Offline'; //set online state to offline
									await pushOfflineDevice();
								}
								break;
							case 'mihomeVacuum':
								if (this.config.mihomeVacuumMaxMinutes === -1) {
									if (!deviceUnreachState) {
										deviceState = 'Offline'; //set online state to offline
										await pushOfflineDevice();
									}
								} else if (lastContact > this.config.mihomeVacuumMaxMinutes) {
									deviceState = 'Offline'; //set online state to offline
									await pushOfflineDevice();
								}
								break;
							case 'nuki-extended':
								if (this.config.nukiextendMaxMinutes === -1) {
									if (!deviceUnreachState) {
										deviceState = 'Offline'; //set online state to offline
										await pushOfflineDevice();
									}
								} else if (lastContact > this.config.nukiextendMaxMinutes) {
									deviceState = 'Offline'; //set online state to offline
									await pushOfflineDevice();
								}
								break;
							case 'ping':
								if (this.config.pingMaxMinutes === -1) {
									if (!deviceUnreachState) {
										deviceState = 'Offline'; //set online state to offline
										await pushOfflineDevice();
									}
								} else if ((lastStateChange > this.config.pingMaxMinutes) && (!deviceUnreachState)) {
									deviceState = 'Offline'; //set online state to offline
									await pushOfflineDevice();
								}
								break;
							case 'shelly':
								if (this.config.shellyMaxMinutes === -1) {
									if (!deviceUnreachState) {
										deviceState = 'Offline'; //set online state to offline
										await pushOfflineDevice();
									}
								} else if (lastContact > this.config.shellyMaxMinutes) {
									deviceState = 'Offline'; //set online state to offline
									await pushOfflineDevice();
								}
								break;
							case 'sonoff':
								if (this.config.sonoffMaxMinutes === -1) {
									if (!deviceUnreachState) {
										deviceState = 'Offline'; //set online state to offline
										await pushOfflineDevice();
									}
								} else if (lastContact > this.config.sonoffMaxMinutes) {
									deviceState = 'Offline'; //set online state to offline
									await pushOfflineDevice();
								}
								break;
							case 'sonos':
								if (this.config.sonosMaxMinutes === -1) {
									if (!deviceUnreachState) {
										deviceState = 'Offline'; //set online state to offline
										await pushOfflineDevice();
									}
								} else if (lastContact > this.config.sonosMaxMinutes) {
									deviceState = 'Offline'; //set online state to offline
									await pushOfflineDevice();
								}
								break;
							case 'switchbotBle':
								if (this.config.switchbotMaxMinutes === -1) {
									if (!deviceUnreachState) {
										deviceState = 'Offline'; //set online state to offline
										await pushOfflineDevice();
									}
								} else if (lastContact > this.config.switchbotMaxMinutes) {
									deviceState = 'Offline'; //set online state to offline
									await pushOfflineDevice();
								}
								break;
							case 'zigbee':
								if (this.config.zigbeeMaxMinutes === -1) {
									if (!deviceUnreachState) {
										deviceState = 'Offline'; //set online state to offline
										await pushOfflineDevice();
									}
								} else if (lastContact > this.config.zigbeeMaxMinutes) {
									deviceState = 'Offline'; //set online state to offline
									await pushOfflineDevice();
								}
								break;
							case 'zwave':
								if (this.config.zwaveMaxMinutes === -1) {
									if (!deviceUnreachState) {
										deviceState = 'Offline'; //set online state to offline
										await pushOfflineDevice();
									}
								} else if (lastContact > this.config.zwaveMaxMinutes) {
									deviceState = 'Offline'; //set online state to offline
									await pushOfflineDevice();
								}
								break;
						}
					} catch (error) {
						this.errorReporting('[getLastContact]', error);
					}
				}



				// 2c. Count how many devcies are offline
				this.offlineDevicesCount = this.offlineDevices.length;

				// 3. Get battery states
				let batteryHealth;
				const deviceLowBatState = await this.getInitValue(currDeviceString + this.arrDev[i].isLowBat);
				const deviceLowBatStateHM = await this.getInitValue(currDeviceString + this.arrDev[i].isLowBat2);

				if ((!deviceBatteryState) && (!shortDeviceBatteryState)) {
					if ((deviceLowBatState !== undefined) || (deviceLowBatStateHM !== undefined)) {
						switch (this.arrDev[i].isLowBat) {
							case 'none':
								batteryHealth = ' - ';
								break;
							default:
								if (!deviceLowBatState) {
									batteryHealth = 'ok';
								} else {
									batteryHealth = 'low';
								}
								break;
						}
						switch (this.arrDev[i].isLowBat2) {
							case 'none':
								batteryHealth = ' - ';
								break;
							default:
								if (!deviceLowBatState) {
									batteryHealth = 'ok';
								} else {
									batteryHealth = 'low';
								}
								break;
						}
						this.batteryPowered.push(
							{
								'Device': deviceName,
								'Adapter': deviceAdapterName,
								'Battery': batteryHealth
							}
						);
					} else {
						batteryHealth = ' - ';
					}
				} else {
					switch (this.arrDev[i].adapter) {
						case 'homematic':
							if (deviceBatteryState === 0) {
								batteryHealth = ' - ';
							} else {
								batteryHealth = deviceBatteryState + 'V';
							}

							this.batteryPowered.push(
								{
									'Device': deviceName,
									'Adapter': deviceAdapterName,
									'Battery': batteryHealth
								}
							);
							break;
						case 'hue-extended':
							if (shortDeviceBatteryState) {
								batteryHealth = shortDeviceBatteryState + '%';
								this.batteryPowered.push(
									{
										'Device': deviceName,
										'Adapter': deviceAdapterName,
										'Battery': batteryHealth
									}
								);
							}
							break;
						case 'mihomeVacuum':
							if (shortDeviceBatteryState) {
								batteryHealth = shortDeviceBatteryState + '%';
								this.batteryPowered.push(
									{
										'Device': deviceName,
										'Adapter': deviceAdapterName,
										'Battery': batteryHealth
									}
								);
							} else if (shortDeviceBatteryState2) {
								batteryHealth = shortDeviceBatteryState2 + '%';
								this.batteryPowered.push(
									{
										'Device': deviceName,
										'Adapter': deviceAdapterName,
										'Battery': batteryHealth
									}
								);
							}
							break;
						default:
							batteryHealth = (deviceBatteryState) + '%';
							this.batteryPowered.push(
								{
									'Device': deviceName,
									'Adapter': deviceAdapterName,
									'Battery': batteryHealth
								}
							);
					}
				}

				// 3b. Count how many devices are with battery
				this.batteryPoweredCount = this.batteryPowered.length;

				// 3c. Count how many devices are with low battery
				const batteryWarningMin = this.config.minWarnBatterie;

				switch (this.arrDev[i].adapter) {
					case 'homematic':
						if (deviceLowBatState || deviceLowBatStateHM) {
							this.batteryLowPowered.push(
								{
									'Device': deviceName,
									'Adapter': deviceAdapterName,
									'Battery': batteryHealth
								}
							);
						}
						break;

					default:
						if (deviceLowBatState) {
							this.batteryLowPowered.push(
								{
									'Device': deviceName,
									'Adapter': deviceAdapterName,
									'Battery': batteryHealth
								}
							);
						} else if (deviceBatteryState && (deviceBatteryState < batteryWarningMin)) {
							this.batteryLowPowered.push(
								{
									'Device': deviceName,
									'Adapter': deviceAdapterName,
									'Battery': batteryHealth
								}
							);
						}
				}

				// 3d. Count how many devices are with low battery
				this.lowBatteryPoweredCount = this.batteryLowPowered.length;

				if (this.config.listOnlyBattery) {   // 4. Add only devices with battery in the list
					if (deviceBatteryState || shortDeviceBatteryState) {
						this.listAllDevices.push(
							{
								'Device': deviceName,
								'Adapter': deviceAdapterName,
								'Battery': batteryHealth,
								'Signal strength': linkQuality,
								'Last contact': lastContactString,
								'Status': deviceState
							}
						);
					}
				} else if (!this.config.listOnlyBattery) { // 4. Add all devices
					this.listAllDevices.push(
						{
							'Device': deviceName,
							'Adapter': deviceAdapterName,
							'Battery': batteryHealth,
							'Signal strength': linkQuality,
							'Last contact': lastContactString,
							'Status': deviceState
						}
					);
				}


				// 4a. Count how many devices are exists
				this.deviceCounter = this.listAllDevices.length;
			}
		} // <-- end of loop
	} // <-- end of createData


	/**
	 * @param {string} [adptName] - Adapter name
	 */
	async createDataForEachAdapter(adptName) {
		// create Data for each Adapter in own lists
		this.log.debug(`Function started: ${this.createDataForEachAdapter.name}`);

		try {
			await this.resetVars(); // reset the arrays and counts

			for (let i = 0; i < this.arrDev.length; i++) {

				if (this.arrDev[i].adapter.includes(adptName)) { // list device only if selected adapter matched with device
					await this.createData(i);
				}
			}
			await this.writeDatapoints(adptName); // fill the datapoints
		} catch (error) {
			this.errorReporting('[createDataForEachAdapter]', error);
		}

		this.log.debug(`Function finished: ${this.createDataForEachAdapter.name}`);
	} // <-- end of createDataForEachAdapter

	async createDataOfAllAdapter() {
		// create Data of all selected adapter in one list
		this.log.debug(`Function started: ${this.createDataOfAllAdapter.name}`);

		try {
			await this.resetVars(); // reset the arrays and counts

			for (let i = 0; i < this.arrDev.length; i++) {

				await this.createData(i);

			}

			if (this.config.checkSendOfflineMsg) await this.sendOfflineNotifications(); // send message if new devices are offline
			if (this.config.checkSendBatteryMsg) await this.sendBatteryNotifications(); // send message for low battery devices
			await this.writeDatapoints(); // fill the datapoints
		} catch (error) {
			this.errorReporting('[createDataOfAllAdapter]', error);
		}

		this.log.debug(`Function finished: ${this.createDataOfAllAdapter.name}`);
	} // <-- end of createDataOfAllAdapter


	/**
	 * Notification service
	 * @param {string} [text] - Text which should be send
	 **/
	async sendNotification(text) {

		// Pushover
		try {
			if (this.config.instancePushover) {
				//first check if instance is living
				const pushoverAliveState = await this.getInitValue('system.adapter.' + this.config.instancePushover + '.alive');

				if (!pushoverAliveState) {
					this.log.warn('Pushover instance is not running. Message could not be sent. Please check your instance configuration.');
				} else {
					await this.sendToAsync(this.config.instancePushover, 'send', {
						message: text,
						title: this.config.titlePushover,
						device: this.config.devicePushover,
						priority: this.config.prioPushover
					});
				}
			}
		} catch (error) {
			this.errorReporting('[sendNotification Pushover]', error);
		}

		// Telegram
		try {
			if (this.config.instanceTelegram) {
				//first check if instance is living
				const telegramAliveState = await this.getInitValue('system.adapter.' + this.config.instanceTelegram + '.alive');

				if (!telegramAliveState) {
					this.log.warn('Telegram instance is not running. Message could not be sent. Please check your instance configuration.');
				} else {
					await this.sendToAsync(this.config.instanceTelegram, 'send', {
						text: text,
						user: this.config.deviceTelegram,
						chatId: this.config.chatIdTelegram
					});
				}
			}
		} catch (error) {
			this.errorReporting('[sendNotification Telegram]', error);
		}

		// Whatsapp
		try {
			if (this.config.instanceWhatsapp) {
				//first check if instance is living
				const whatsappAliveState = await this.getInitValue('system.adapter.' + this.config.instanceWhatsapp + '.alive');

				if (!whatsappAliveState) {
					this.log.warn('Whatsapp instance is not running. Message could not be sent. Please check your instance configuration.');
				} else {
					await this.sendToAsync(this.config.instanceWhatsapp, 'send', {
						text: text,
						phone: this.config.phoneWhatsapp
					});
				}
			}
		} catch (error) {
			this.errorReporting('[sendNotification Whatsapp]', error);
		}

		// Email
		try {
			if (this.config.instanceEmail) {
				//first check if instance is living
				const eMailAliveState = await this.getInitValue('system.adapter.' + this.config.instanceEmail + '.alive');

				if (!eMailAliveState) {
					this.log.warn('eMail instance is not running. Message could not be sent. Please check your instance configuration.');
				} else {
					await this.sendToAsync(this.config.instanceEmail, 'send', {
						sendTo: this.config.sendToEmail,
						text: text,
						subject: this.config.subjectEmail
					});
				}
			}
		} catch (error) {
			this.errorReporting('[sendNotification eMail]', error);
		}

		// Jarvis Notification
		try {
			if (this.config.instanceJarvis) {
				//first check if instance is living
				const jarvisAliveState = await this.getInitValue('system.adapter.' + this.config.instanceJarvis + '.alive');

				if (!jarvisAliveState) {
					this.log.warn('Jarvis instance is not running. Message could not be sent. Please check your instance configuration.');
				} else {
					const jsonText = JSON.stringify(text);
					await this.setForeignStateAsync(`${this.config.instanceJarvis}.addNotification`, '{"title":"' + this.config.titleJarvis + ' (' + this.formatDate(new Date(), 'DD.MM.YYYY - hh:mm:ss') + ')","message": ' + jsonText + ',"display": "drawer"}');
				}
			}
		} catch (error) {
			this.errorReporting('[sendNotification Jarvis]', error);
		}

		// Lovelace Notification
		try {
			if (this.config.instanceLovelace) {
				//first check if instance is living
				const lovelaceAliveState = await this.getInitValue('system.adapter.' + this.config.instanceLovelace + '.alive');

				if (!lovelaceAliveState) {
					this.log.warn('Lovelace instance is not running. Message could not be sent. Please check your instance configuration.');
				} else {
					const jsonText = JSON.stringify(text);
					await this.setForeignStateAsync(`${this.config.instanceLovelace}.notifications.add`, '{"message":' + jsonText + ', "title":"' + this.config.titleLovelace + ' (' + this.formatDate(new Date(), 'DD.MM.YYYY - hh:mm:ss') + ')"}');
				}
			}
		} catch (error) {
			this.errorReporting('[sendNotification Lovelace]', error);
		}
	} // <-- End of sendNotification function


	async sendOfflineNotifications() {
		// send message if an device is offline

		this.log.debug(`Start the function: ${this.sendOfflineNotifications.name}`);

		try {
			let msg = '';
			const offlineDevicesCountOld = await this.getOwnInitValue('offlineCount');

			if ((this.offlineDevicesCount != offlineDevicesCountOld)) {
				if (this.offlineDevicesCount == 1) {	// make singular if it is only one device
					msg = 'Folgendes Gerät ist seit einiger Zeit nicht erreichbar: \n';
				} else if (this.offlineDevicesCount >= 2) {		//make plural if it is more than one device
					msg = `Folgende ${this.offlineDevicesCount} Geräte sind seit einiger Zeit nicht erreichbar: \n`;
				}

				for (const id of this.offlineDevices) {
					msg = `${msg} \n ${id['Device']} (${id['Last contact']})`;
				}
				this.log.info(msg);
				await this.setStateAsync('lastNotification', msg, true);
				await this.sendNotification(msg);
			}
		} catch (error) {
			this.errorReporting('[sendOfflineMessage]', error);
		}
		this.log.debug(`Finished the function: ${this.sendOfflineNotifications.name}`);
	}//<--End of offline notification


	async sendBatteryNotifications() {
		// send message for low battery devices

		this.log.debug(`Start the function: ${this.sendBatteryNotifications.name}`);

		try {

			const now = new Date(); // get date
			const today = now.getDay();
			const checkDays = []; // list of selected days
			let checkToday; // indicator if selected day is today

			// push the selected days in list
			if (this.config.checkMonday) checkDays.push(1);
			if (this.config.checkTuesday) checkDays.push(2);
			if (this.config.checkWednesday) checkDays.push(3);
			if (this.config.checkThursday) checkDays.push(4);
			if (this.config.checkFriday) checkDays.push(5);
			if (this.config.checkSaturday) checkDays.push(6);
			if (this.config.checkSunday) checkDays.push(0);

			//Check if the message should be send today
			checkDays.forEach(object => {
				if ((object >= 0) && today == object) {
					checkToday = true;
				}
			});

			if (checkDays.length >= 1) { // check if an day is selected
				this.log.debug(`Number of selected days: ${checkDays.length}. Send Message on: ${(checkDays).join(', ')} ...`);
			} else {
				this.log.warn(`No days selected. Please check the instance configuration!`);
				return; // break off function if no day is selected
			}

			// Check if the message for low battery was already sent today
			const lastBatteryNotifyIndicator = await this.getOwnInitValue('info.lastBatteryNotification');

			// set indicator for send message first to 'false', after sending to 'true'
			if (now.getHours() < 11) { await this.setStateAsync('info.lastBatteryNotification', false, true); }

			// if time is > 11 (12:00 pm create message for low battery devices)
			if ((now.getHours() > 11) && (!lastBatteryNotifyIndicator) && (checkToday != undefined)) {
				let msg = '';

				for (const id of this.batteryLowPowered) {
					msg = '\n' + id['Device'] + ' (' + id['Battery'] + ')'.split(', ');
				}

				if (this.lowBatteryPoweredCount > 0) {
					this.log.info(`Niedrige Batteriezustände: ${msg}`);
					await this.setStateAsync('lastNotification', `Niedrige Batteriezustände: ${msg}`, true);

					await this.sendNotification(`Niedriege Batteriezustände: ${msg}`);

					await this.setStateAsync('info.lastBatteryNotification', true, true);
				}
			}
		} catch (error) {
			this.errorReporting('[sendOfflineMessage]', error);
		}

		this.log.debug(`Finished the function: ${this.sendBatteryNotifications.name}`);
	}//<--End of battery notification


	async resetVars() {
		//Reset all arrays and counts
		this.log.debug(`Function started: ${this.resetVars.name}`);

		// arrays
		this.offlineDevices = [],
		this.linkQualityDevices = [];
		this.batteryPowered = [];
		this.batteryLowPowered = [];
		this.listAllDevices = [];

		// counts
		this.offlineDevicesCount = 0;
		this.deviceCounter = 0;
		this.linkQualityCount = 0;
		this.batteryPoweredCount = 0;
		this.lowBatteryPoweredCount = 0;

		this.deviceReachable = '';

		this.log.debug(`Function finished: ${this.resetVars.name}`);
	} // <-- end of resetVars


	/**
	 * @param {string} [adptName] - Adaptername
	 */
	async writeDatapoints(adptName) {
		// fill the datapoints

		this.log.debug(`Start the function: ${this.writeDatapoints.name}`);

		try {

			let dpSubFolder;
			//write the datapoints in subfolders with the adaptername otherwise write the dP's in the root folder
			if (adptName) {
				dpSubFolder = adptName + '.';
			} else {
				dpSubFolder = '';
			}

			await this.setStateAsync(`${dpSubFolder}offlineCount`, { val: this.offlineDevicesCount, ack: true });
			await this.setStateAsync(`${dpSubFolder}countAll`, { val: this.deviceCounter, ack: true });
			await this.setStateAsync(`${dpSubFolder}batteryCount`, { val: this.batteryPoweredCount, ack: true });
			await this.setStateAsync(`${dpSubFolder}lowBatteryCount`, { val: this.lowBatteryPoweredCount, ack: true });

			if (this.deviceCounter == 0) {
				// if no device is count, write the JSON List with default value
				this.listAllDevices = [{ 'Device': '--none--', 'Adapter': '', 'Battery': '', 'Last contact': '', 'Signal strength': '' }];
			}
			await this.setStateAsync(`${dpSubFolder}listAll`, { val: JSON.stringify(this.listAllDevices), ack: true });

			if (this.linkQualityCount == 0) {
				// if no device is count, write the JSON List with default value
				this.linkQualityDevices = [{ 'Device': '--none--', 'Adapter': '', 'Signal strength': '' }];
			}
			//write JSON list
			await this.setStateAsync(`${dpSubFolder}linkQualityList`, { val: JSON.stringify(this.linkQualityDevices), ack: true });
			//write HTML list
			if (this.config.createHtmlList) await this.setStateAsync(`${dpSubFolder}linkQualityListHTML`, { val: await this.creatLinkQualityListHTML(this.linkQualityDevices, this.linkQualityCount), ack: true });

			if (this.offlineDevicesCount == 0) {
				// if no device is count, write the JSON List with default value
				this.offlineDevices = [{ 'Device': '--none--', 'Adapter': '', 'Last contact': '' }];
			}
			//write JSON list
			await this.setStateAsync(`${dpSubFolder}offlineList`, { val: JSON.stringify(this.offlineDevices), ack: true });
			//write HTML list
			if (this.config.createHtmlList) await this.setStateAsync(`${dpSubFolder}offlineListHTML`, { val: await this.createOfflineListHTML(this.offlineDevices, this.offlineDevicesCount), ack: true });

			if (this.batteryPoweredCount == 0) {
				// if no device is count, write the JSON List with default value
				this.batteryPowered = [{ 'Device': '--none--', 'Adapter': '', 'Battery': '' }];
			}
			//write JSON list
			await this.setStateAsync(`${dpSubFolder}batteryList`, { val: JSON.stringify(this.batteryPowered), ack: true });
			//write HTML list
			if (this.config.createHtmlList) await this.setStateAsync(`${dpSubFolder}batteryListHTML`, { val: await this.createBatteryListHTML(this.batteryPowered, this.batteryPoweredCount, false), ack: true });

			if (this.lowBatteryPoweredCount == 0) {
				// if no device is count, write the JSON List with default value
				this.batteryLowPowered = [{ 'Device': '--none--', 'Adapter': '', 'Battery': '' }];
			}
			//write JSON list
			await this.setStateAsync(`${dpSubFolder}lowBatteryList`, { val: JSON.stringify(this.batteryLowPowered), ack: true });
			//write HTML list
			if (this.config.createHtmlList) await this.setStateAsync(`${dpSubFolder}lowBatteryListHTML`, { val: await this.createBatteryListHTML(this.batteryLowPowered, this.lowBatteryPoweredCount, true), ack: true });

			// create timestamp of last run
			const lastCheck = this.formatDate(new Date(), 'DD.MM.YYYY') + ' - ' + this.formatDate(new Date(), 'hh:mm:ss');
			await this.setStateAsync('lastCheck', lastCheck, true);
		}
		catch (error) {
			this.errorReporting('[writeDatapoints]', error);
		}
		this.log.debug(`Function finished: ${this.writeDatapoints.name}`);
	}//<--End  of writing Datapoints

	/**
	 * @param {object} [devices] - Device
	 * @param {number} [deviceCount] - Counted devices
	 */
	async creatLinkQualityListHTML(devices, deviceCount) {
		devices = devices.sort((a, b) => { return a.Device.localeCompare(b.Device); });
		let html = `<center>
		<b>Link Quality Devices:<font> ${deviceCount}</b><small></small></font>
		<p></p>
		</center>   
		<table width=100%>
		<tr>
		<th align=left>Device</th>
		<th align=center width=120>Adapter</th>
		<th align=right>Link Quality</th>
		</tr>
		<tr>
		<td colspan="5"><hr></td>
		</tr>`;

		for (const device of devices) {
			html += `<tr>
			<td><font>${device.Device}</font></td>
			<td align=center><font>${device.Adapter}</font></td>
			<td align=right><font>${device['Signal strength']}</font></td>
			</tr>`;
		}

		html += '</table>';
		return html;
	}

	/**
	 * @param {object} [devices] - Device
	 * @param {number} [deviceCount] - Counted devices
	 */
	async createOfflineListHTML(devices, deviceCount) {
		devices = devices.sort((a, b) => { return a.Device.localeCompare(b.Device); });
		let html = `<center>
		<b>Offline Devices: <font color=${deviceCount == 0 ? '#3bcf0e' : 'orange'}>${deviceCount}</b><small></small></font>
		<p></p>
		</center>   
		<table width=100%>
		<tr>
		<th align=left>Device</th>
		<th align=center width=120>Adapter</th>
		<th align=center>Letzter Kontakt</th>
		</tr>
		<tr>
		<td colspan="5"><hr></td>
		</tr>`;

		for (const device of devices) {
			html += `<tr>
			<td><font>${device.Device}</font></td>
			<td align=center><font>${device.Adapter}</font></td>
			<td align=center><font color=orange>${device['Last contact']}</font></td>
			</tr>`;
		}

		html += '</table>';
		return html;
	}

	/**
	 * @param {object} [devices] - Device
	 * @param {object} [deviceCount] - Counted devices
	 * @param {object} [isLowBatteryList] - list Low Battery Devices
	 */
	async createBatteryListHTML(devices, deviceCount, isLowBatteryList) {
		devices = devices.sort((a, b) => { return a.Device.localeCompare(b.Device); });
		let html = `<center>
		<b>${isLowBatteryList == true ? 'Schwache ' : ''}Batterie Devices: <font color=${isLowBatteryList == true ? (deviceCount > 0 ? 'orange' : '#3bcf0e') : ''}>${deviceCount}</b></font>
		<p></p>
		</center>   
		<table width=100%>
		<tr>
		<th align=left>Device</th>
		<th align=center width=120>Adapter</th>
		<th align=${isLowBatteryList ? 'center' : 'right'}>Batterie</th>
		</tr>
		<tr>
		<td colspan="5"><hr></td>
		</tr>`;

		for (const device of devices) {
			html += `<tr>
			<td><font>${device.Device}</font></td>
			<td align=center><font>${device.Adapter}</font></td>`;

			if (isLowBatteryList) {
				html += `<td align=center><font color=orange>${device.Battery}</font></td>`;
			} else {
				html += `<td align=right><font color=#3bcf0e>${device.Battery}</font></td>`;
			}

			html += `</tr>`;
		}

		html += '</table>';
		return html;
	}

	/**
	 * @param {string} [codePart] - Message Prefix
	 * @param {object} [error] - Sentry message
	 */
	errorReporting(codePart, error) {
		const msg = `[${codePart}] error: ${error.message}`;
		if (enableSendSentry) {
			if (this.supportsFeature && this.supportsFeature('PLUGINS')) {
				const sentryInstance = this.getPluginInstance('sentry');
				if (sentryInstance) {
					this.log.warn(`Error catched and sent to Sentry, error: ${msg}`);
					sentryInstance.getSentryObject().captureException(msg);
				}
			}
		} else {
			this.log.error(`Sentry disabled, error catched : ${msg}`);
		}
	} // <-- end of errorReporting


	onUnload(callback) {
		try {
			this.log.info('cleaned everything up...');
			callback();
		} catch (e) {
			callback();
		}
	}
}

if (require.main !== module) {
	// Export the constructor in compact mode
	/**
	 * @param {Partial<utils.AdapterOptions>} [options={}]
	 */
	module.exports = (options) => new DeviceWatcher(options);
} else {
	// otherwise start the instance directly
	new DeviceWatcher();
}
