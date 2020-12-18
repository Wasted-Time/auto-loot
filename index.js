'use strict';
const config = require('./config.js');

module.exports = function AutoLootOld(mod) {
    const cmd = mod.command || mod.require.command;

    let enable = config.enable,
        enableAuto = config.enableAuto,
        interval = config.interval,
        throttleMax = config.throttleMax,
        scanInterval = config.scanInterval,
        radius = config.radius;

    let location = null,
        items = new Map(),
		lootTimeout = null;

	cmd.add('loot', {
		$default() {
			enable = !enable;
			mod.command.message(`${enable ? 'en' : 'dis'}abled`);
		},
		auto() {
			enableAuto = !enableAuto;
			mod.command.message(`auto-loot ${enableAuto ? 'en' : 'dis'}abled`);
		}
	});

    mod.game.me.on('change_zone', () => { items.clear(); });
	
	mod.hook('S_RETURN_TO_LOBBY', 1, () => { items.clear(); });
    mod.hook('C_PLAYER_LOCATION', 5, (e) => { location = e.loc; });
    mod.hook('S_SYSTEM_MESSAGE', 1, (e) => { if (e.message === '@41') return false });
    mod.hook('C_TRY_LOOT_DROPITEM', 4, () => { if(enable && !lootTimeout) lootTimeout = setTimeout(tryLoot, interval); });
    mod.hook('S_DESPAWN_DROPITEM', 4, (e) => { items.delete(e.gameId); });

    mod.hook('S_SPAWN_DROPITEM', 9, (e) => {
        if(!(config.blacklist.includes(e.item)) && (e.item < 8000 || e.item > 8024) && e.owners.some(owner => owner === mod.game.me.playerId)){
			items.set(e.gameId, Object.assign(e, {priority: 0}));
			if(enableAuto && !lootTimeout) tryLoot();
        }
    });

    function tryLoot() {
		clearTimeout(lootTimeout);
		lootTimeout = null;
		if(!items.size || mod.game.me.mounted) return;
		for(let item of [...items.values()].sort((a, b) => a.priority - b.priority)){
			if(location.dist3D(item.loc) <= radius){
				mod.send('C_TRY_LOOT_DROPITEM', 4, { gameId: item.gameId });
				lootTimeout = setTimeout(tryLoot, Math.min(interval * ++item.priority, throttleMax));
				return;
			}
		}
		if(enableAuto) setTimeout(tryLoot, scanInterval);
    }
}